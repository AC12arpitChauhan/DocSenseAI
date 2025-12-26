"""
LangChain tools for the AI Search Agent.
Provides document search, PDF reading, and citation capabilities.
"""
from typing import Optional, Annotated
from langchain_core.tools import tool

from app.pdf import get_pdf_processor
from app.models import Citation


@tool
def search_documents(
    query: Annotated[str, "The search query to find relevant documents"],
    max_results: Annotated[int, "Maximum number of results to return"] = 5
) -> str:
    """
    Search across all available PDF documents for relevant content.
    Returns matching text snippets with document and page information.
    """
    processor = get_pdf_processor()
    results = processor.search_text(query, max_results=max_results)
    
    if not results:
        return "No relevant documents found for the query."
    
    output_parts = [f"Found {len(results)} relevant result(s):\n"]
    
    for i, (filename, page_num, context, start, end) in enumerate(results, 1):
        output_parts.append(
            f"\n[Result {i}]\n"
            f"Document: {filename}\n"
            f"Page: {page_num}\n"
            f"Content: {context}\n"
        )
    
    return "".join(output_parts)


@tool
def read_pdf_page(
    filename: Annotated[str, "Name of the PDF file"],
    page_number: Annotated[int, "Page number to read (1-indexed)"]
) -> str:
    """
    Read the full text content of a specific page from a PDF document.
    Use this to get detailed information from a specific location.
    """
    processor = get_pdf_processor()
    page = processor.extract_page(filename, page_number)
    
    if not page:
        return f"Could not read page {page_number} from {filename}. The file may not exist or the page number is invalid."
    
    return (
        f"Content from {filename}, Page {page_number}:\n"
        f"(Word count: {page.word_count})\n\n"
        f"{page.text}"
    )


@tool
def list_available_documents() -> str:
    """
    List all available PDF documents in the knowledge base.
    Returns document names, page counts, and file sizes.
    """
    processor = get_pdf_processor()
    pdfs = processor.list_pdfs()
    
    if not pdfs:
        return "No PDF documents are currently available in the knowledge base."
    
    output_parts = [f"Available documents ({len(pdfs)} total):\n"]
    
    for pdf in pdfs:
        size_kb = pdf.size_bytes / 1024
        title = pdf.title if pdf.title else "Untitled"
        output_parts.append(
            f"\n- {pdf.filename}\n"
            f"  Title: {title}\n"
            f"  Pages: {pdf.page_count}\n"
            f"  Size: {size_kb:.1f} KB\n"
        )
    
    return "".join(output_parts)


@tool
def get_document_summary(
    filename: Annotated[str, "Name of the PDF file to summarize"]
) -> str:
    """
    Get a summary of a PDF document including metadata and first page content.
    Useful for understanding what a document contains before reading specific pages.
    """
    processor = get_pdf_processor()
    document = processor.extract_document(filename)
    
    if not document:
        return f"Could not find document: {filename}"
    
    first_page_preview = ""
    if document.pages:
        first_page = document.pages[0]
        preview_text = first_page.text[:500]
        if len(first_page.text) > 500:
            preview_text += "..."
        first_page_preview = f"\n\nFirst page preview:\n{preview_text}"
    
    return (
        f"Document: {document.filename}\n"
        f"Title: {document.metadata.title or 'Untitled'}\n"
        f"Total Pages: {document.metadata.page_count}\n"
        f"Size: {document.metadata.size_bytes / 1024:.1f} KB"
        f"{first_page_preview}"
    )


# Export all tools as a list for easy registration
AGENT_TOOLS = [
    search_documents,
    read_pdf_page,
    list_available_documents,
    get_document_summary,
]
