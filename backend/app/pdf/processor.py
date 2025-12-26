"""
PDF processing module using pdfplumber.
Handles extraction of text content from PDF documents with page-level granularity.
"""
import os
from pathlib import Path
from typing import Optional
import pdfplumber
from functools import lru_cache

from app.models import PDFMetadata, PDFPage, PDFDocument, Citation


class PDFProcessor:
    """
    Processes PDF documents for text extraction and citation generation.
    Maintains a cache of processed documents for efficient repeated access.
    """
    
    def __init__(self, pdf_directory: str):
        """
        Initialize the PDF processor.
        
        Args:
            pdf_directory: Path to the directory containing PDF files
        """
        self.pdf_directory = Path(pdf_directory)
        if not self.pdf_directory.exists():
            self.pdf_directory.mkdir(parents=True, exist_ok=True)
        self._document_cache: dict[str, PDFDocument] = {}
        self._page_text_cache: dict[str, dict[int, str]] = {}
    
    def list_pdfs(self) -> list[PDFMetadata]:
        """
        List all available PDF documents with their metadata.
        
        Returns:
            List of PDFMetadata objects for each PDF in the directory
        """
        pdfs = []
        for pdf_path in self.pdf_directory.glob("*.pdf"):
            try:
                with pdfplumber.open(pdf_path) as pdf:
                    metadata = PDFMetadata(
                        filename=pdf_path.name,
                        title=pdf.metadata.get("Title") if pdf.metadata else None,
                        page_count=len(pdf.pages),
                        size_bytes=pdf_path.stat().st_size
                    )
                    pdfs.append(metadata)
            except Exception as e:
                # Skip invalid PDFs but log the error
                print(f"Error reading PDF {pdf_path.name}: {e}")
        return pdfs
    
    def get_pdf_path(self, filename: str) -> Optional[Path]:
        """
        Get the full path to a PDF file.
        
        Args:
            filename: Name of the PDF file
            
        Returns:
            Path to the PDF file, or None if not found
        """
        pdf_path = self.pdf_directory / filename
        if pdf_path.exists() and pdf_path.suffix.lower() == ".pdf":
            return pdf_path
        return None
    
    def extract_document(self, filename: str, use_cache: bool = True) -> Optional[PDFDocument]:
        """
        Extract all content from a PDF document.
        
        Args:
            filename: Name of the PDF file
            use_cache: Whether to use cached results
            
        Returns:
            PDFDocument with all pages extracted, or None if file not found
        """
        # Check cache first
        if use_cache and filename in self._document_cache:
            return self._document_cache[filename]
        
        pdf_path = self.get_pdf_path(filename)
        if not pdf_path:
            return None
        
        try:
            pages: list[PDFPage] = []
            with pdfplumber.open(pdf_path) as pdf:
                metadata = PDFMetadata(
                    filename=filename,
                    title=pdf.metadata.get("Title") if pdf.metadata else None,
                    page_count=len(pdf.pages),
                    size_bytes=pdf_path.stat().st_size
                )
                
                for i, page in enumerate(pdf.pages, start=1):
                    text = page.extract_text() or ""
                    pages.append(PDFPage(
                        page_number=i,
                        text=text,
                        word_count=len(text.split())
                    ))
                    
                    # Also cache individual page text
                    if filename not in self._page_text_cache:
                        self._page_text_cache[filename] = {}
                    self._page_text_cache[filename][i] = text
            
            document = PDFDocument(
                filename=filename,
                metadata=metadata,
                pages=pages
            )
            
            # Cache the document
            self._document_cache[filename] = document
            return document
            
        except Exception as e:
            print(f"Error extracting PDF {filename}: {e}")
            return None
    
    def extract_page(self, filename: str, page_number: int) -> Optional[PDFPage]:
        """
        Extract content from a specific page of a PDF.
        
        Args:
            filename: Name of the PDF file
            page_number: 1-indexed page number
            
        Returns:
            PDFPage with text content, or None if not found
        """
        # Check page cache first
        if filename in self._page_text_cache and page_number in self._page_text_cache[filename]:
            text = self._page_text_cache[filename][page_number]
            return PDFPage(
                page_number=page_number,
                text=text,
                word_count=len(text.split())
            )
        
        pdf_path = self.get_pdf_path(filename)
        if not pdf_path:
            return None
        
        try:
            with pdfplumber.open(pdf_path) as pdf:
                if page_number < 1 or page_number > len(pdf.pages):
                    return None
                
                page = pdf.pages[page_number - 1]
                text = page.extract_text() or ""
                
                # Cache the page text
                if filename not in self._page_text_cache:
                    self._page_text_cache[filename] = {}
                self._page_text_cache[filename][page_number] = text
                
                return PDFPage(
                    page_number=page_number,
                    text=text,
                    word_count=len(text.split())
                )
                
        except Exception as e:
            print(f"Error extracting page {page_number} from {filename}: {e}")
            return None
    
    def search_text(
        self, 
        query: str, 
        filename: Optional[str] = None,
        max_results: int = 10
    ) -> list[tuple[str, int, str, int, int]]:
        """
        Search for text across PDF documents.
        
        Args:
            query: Text to search for (case-insensitive)
            filename: Optional specific file to search, or all files if None
            max_results: Maximum number of results to return
            
        Returns:
            List of tuples: (filename, page_number, context_snippet, start_pos, end_pos)
        """
        results: list[tuple[str, int, str, int, int]] = []
        query_lower = query.lower()
        
        # Determine which files to search
        if filename:
            files_to_search = [filename]
        else:
            files_to_search = [f.filename for f in self.list_pdfs()]
        
        for fname in files_to_search:
            document = self.extract_document(fname)
            if not document:
                continue
            
            for page in document.pages:
                text_lower = page.text.lower()
                start = 0
                
                while True:
                    pos = text_lower.find(query_lower, start)
                    if pos == -1:
                        break
                    
                    # Extract context around the match (100 chars before and after)
                    context_start = max(0, pos - 100)
                    context_end = min(len(page.text), pos + len(query) + 100)
                    context = page.text[context_start:context_end]
                    
                    # Add ellipsis if truncated
                    if context_start > 0:
                        context = "..." + context
                    if context_end < len(page.text):
                        context = context + "..."
                    
                    results.append((
                        fname,
                        page.page_number,
                        context,
                        pos,
                        pos + len(query)
                    ))
                    
                    if len(results) >= max_results:
                        return results
                    
                    start = pos + 1
        
        return results
    
    def create_citation(
        self,
        citation_id: int,
        filename: str,
        page_number: int,
        text_snippet: str,
        start_char: Optional[int] = None,
        end_char: Optional[int] = None
    ) -> Citation:
        """
        Create a Citation object for a specific reference.
        
        Args:
            citation_id: The citation number (1-indexed)
            filename: PDF document filename
            page_number: Page number in the document
            text_snippet: Relevant text excerpt
            start_char: Optional start character position
            end_char: Optional end character position
            
        Returns:
            Citation object
        """
        return Citation(
            id=citation_id,
            document_name=filename,
            page_number=page_number,
            text_snippet=text_snippet[:200] if len(text_snippet) > 200 else text_snippet,
            start_char=start_char,
            end_char=end_char
        )
    
    def get_semantic_chunks(
        self, 
        filename: str, 
        chunk_size: int = 500,
        overlap: int = 50
    ) -> list[tuple[int, str]]:
        """
        Split a PDF document into semantic chunks for better retrieval.
        
        Args:
            filename: PDF filename
            chunk_size: Target size of each chunk in characters
            overlap: Number of overlapping characters between chunks
            
        Returns:
            List of tuples: (page_number, chunk_text)
        """
        document = self.extract_document(filename)
        if not document:
            return []
        
        chunks: list[tuple[int, str]] = []
        
        for page in document.pages:
            text = page.text
            if not text:
                continue
            
            # Split into chunks with overlap
            start = 0
            while start < len(text):
                end = start + chunk_size
                chunk = text[start:end]
                
                # Try to break at a sentence boundary
                if end < len(text):
                    last_period = chunk.rfind(". ")
                    if last_period > chunk_size // 2:
                        chunk = chunk[:last_period + 1]
                        end = start + last_period + 1
                
                chunks.append((page.page_number, chunk.strip()))
                start = end - overlap
        
        return chunks
    
    def clear_cache(self):
        """Clear all cached documents and page text."""
        self._document_cache.clear()
        self._page_text_cache.clear()


# Singleton instance for the application
_pdf_processor: Optional[PDFProcessor] = None


def get_pdf_processor() -> PDFProcessor:
    """
    Get the singleton PDFProcessor instance.
    Initializes with the PDF_DIRECTORY environment variable.
    """
    global _pdf_processor
    if _pdf_processor is None:
        pdf_dir = os.getenv("PDF_DIRECTORY", "./pdfs")
        _pdf_processor = PDFProcessor(pdf_dir)
    return _pdf_processor
