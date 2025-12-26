"""Script to generate a sample PDF for testing."""
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from reportlab.lib.units import inch

def create_sample_pdf():
    """Create a sample PDF document for testing."""
    c = canvas.Canvas("sample_document.pdf", pagesize=letter)
    width, height = letter
    
    # Page 1
    c.setFont("Helvetica-Bold", 24)
    c.drawString(inch, height - inch, "AI Search Chat - Sample Document")
    
    c.setFont("Helvetica", 12)
    c.drawString(inch, height - 1.5*inch, "This is a sample document for testing the AI Search Chat application.")
    
    y = height - 2.5*inch
    paragraphs = [
        "Introduction:",
        "This document contains sample content that can be searched and cited by the AI.",
        "The AI will analyze the text and provide relevant answers with citations.",
        "",
        "Key Features:",
        "1. Real-time streaming responses with token-by-token output",
        "2. Clickable citations that open the PDF viewer",
        "3. Tool call indicators showing what the AI is doing",
        "4. Generative UI components like tables and charts",
        "",
        "Technical Details:",
        "The application uses LangGraph for agent orchestration.",
        "Redis Queue handles asynchronous job processing.",
        "Server-Sent Events (SSE) provide real-time streaming.",
    ]
    
    for para in paragraphs:
        c.drawString(inch, y, para)
        y -= 0.4*inch
    
    c.showPage()
    
    # Page 2
    c.setFont("Helvetica-Bold", 18)
    c.drawString(inch, height - inch, "Page 2 - More Information")
    
    c.setFont("Helvetica", 12)
    y = height - 1.5*inch
    paragraphs = [
        "Architecture Overview:",
        "- Frontend: Next.js 15 with TypeScript, Tailwind CSS, Framer Motion",
        "- Backend: Python FastAPI with LangChain and LangGraph",
        "- Database: Redis for pub/sub and job queuing",
        "- LLM: Google Gemini 2.5 Flash for natural language processing",
        "",
        "Usage Instructions:",
        "1. Upload your PDF documents to the pdfs directory",
        "2. Ask questions about your documents in the chat interface",
        "3. Click on citations to view the source in the PDF viewer",
        "4. Use the PDF navigation controls to browse pages",
        "",
        "This page demonstrates multi-page document support.",
        "The AI can search across all pages and provide accurate citations.",
    ]
    
    for para in paragraphs:
        c.drawString(inch, y, para)
        y -= 0.4*inch
    
    c.showPage()
    
    # Page 3
    c.setFont("Helvetica-Bold", 18)
    c.drawString(inch, height - inch, "Page 3 - Summary")
    
    c.setFont("Helvetica", 12)
    y = height - 1.5*inch
    paragraphs = [
        "Summary:",
        "This sample document demonstrates the capabilities of the AI Search Chat.",
        "",
        "Benefits:",
        "- Quick access to information from large documents",
        "- Automatic citation generation for transparency",
        "- Interactive PDF viewer for source verification",
        "- Real-time responses for immediate feedback",
        "",
        "For more information, please refer to the README.md file.",
    ]
    
    for para in paragraphs:
        c.drawString(inch, y, para)
        y -= 0.4*inch
    
    c.save()
    print("Created sample_document.pdf")

if __name__ == "__main__":
    create_sample_pdf()
