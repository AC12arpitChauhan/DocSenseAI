"""
LangGraph agent implementation for AI Search Chat.
Implements a multi-node agent with streaming capabilities for document retrieval and synthesis.
"""
import os
import re
from typing import TypedDict, Annotated, Sequence, Literal, Any
from operator import add

from langchain_core.messages import BaseMessage, HumanMessage, AIMessage, SystemMessage
from langchain_google_genai import ChatGoogleGenerativeAI
from langgraph.graph import StateGraph, END
from langgraph.prebuilt import ToolNode

from app.langgraph.tools import AGENT_TOOLS
from app.pdf import get_pdf_processor
from app.models import (
    Citation,
    UIBlock,
    UIBlockType,
    InfoCardData,
    TableData,
    ToolType,
)
from app.streaming import get_stream_publisher


# ============================================================
# Agent State Definition
# ============================================================

class AgentState(TypedDict):
    """State passed between LangGraph nodes."""
    messages: Annotated[Sequence[BaseMessage], add]
    job_id: str
    query: str
    relevant_documents: list[tuple[str, int, str]]  # (filename, page, text)
    citations: list[Citation]
    ui_blocks: list[UIBlock]
    current_step: str
    final_response: str
    error_message: str | None


# ============================================================
# Streaming Callback
# ============================================================

class StreamingHandler:
    """Handles streaming events during agent execution."""
    
    def __init__(self, job_id: str):
        self.job_id = job_id
        self.publisher = get_stream_publisher()
        self.citation_counter = 0
    
    def on_tool_start(self, tool_name: str):
        """Called when a tool starts executing."""
        tool_descriptions = {
            "search_documents": ("🔍 Searching documents...", ToolType.SEARCH_DOCUMENTS),
            "read_pdf_page": ("📄 Reading PDF page...", ToolType.READ_PDF),
            "list_available_documents": ("📚 Listing documents...", ToolType.SEARCH_DOCUMENTS),
            "get_document_summary": ("📋 Getting document summary...", ToolType.READ_PDF),
        }
        
        desc, tool_type = tool_descriptions.get(
            tool_name, 
            (f"🧠 Running {tool_name}...", ToolType.ANALYZE_CONTENT)
        )
        
        self.publisher.publish_tool_start(
            self.job_id,
            tool_type=tool_type,
            tool_name=tool_name,
            description=desc
        )
    
    def on_tool_end(self, tool_name: str, success: bool, summary: str | None = None):
        """Called when a tool finishes executing."""
        tool_types = {
            "search_documents": ToolType.SEARCH_DOCUMENTS,
            "read_pdf_page": ToolType.READ_PDF,
            "list_available_documents": ToolType.SEARCH_DOCUMENTS,
            "get_document_summary": ToolType.READ_PDF,
        }
        
        tool_type = tool_types.get(tool_name, ToolType.ANALYZE_CONTENT)
        
        self.publisher.publish_tool_end(
            self.job_id,
            tool_type=tool_type,
            tool_name=tool_name,
            success=success,
            result_summary=summary
        )
    
    def stream_text(self, text: str):
        """Stream a text chunk to the client."""
        self.publisher.publish_text_chunk(self.job_id, text)
    
    def add_citation(self, citation: Citation):
        """Publish a citation event."""
        self.publisher.publish_citation(self.job_id, citation)
    
    def add_ui_block(self, block: UIBlock):
        """Publish a UI block event."""
        self.publisher.publish_ui_block(self.job_id, block)
    
    def finish(self, total_tokens: int | None = None):
        """Signal that streaming is complete."""
        self.publisher.publish_done(self.job_id, total_tokens)
    
    def error(self, message: str, recoverable: bool = True):
        """Publish an error event."""
        self.publisher.publish_error(self.job_id, message, recoverable)


# ============================================================
# Agent Nodes
# ============================================================

def create_llm():
    """Create the LLM instance."""
    return ChatGoogleGenerativeAI(
        model="gemini-2.5-flash-lite",
        temperature=0.7,
    )


def analyze_query_node(state: AgentState) -> dict[str, Any]:
    """
    Analyze the user's query to understand intent and required actions.
    """
    handler = StreamingHandler(state["job_id"])
    handler.on_tool_start("analyze_query")
    
    llm = create_llm()
    
    system_prompt = """You are a helpful AI assistant that searches through PDF documents to answer questions.
    
    Analyze the user's query and determine:
    1. What information they are looking for
    2. What documents might contain this information
    3. Whether to search across documents or look at specific pages
    
    Keep your analysis brief and actionable."""
    
    messages = [
        SystemMessage(content=system_prompt),
        HumanMessage(content=f"User query: {state['query']}\n\nAnalyze this query and explain what to search for.")
    ]
    
    response = llm.invoke(messages)
    
    handler.on_tool_end("analyze_query", True, "Query analyzed")
    
    return {
        "messages": [response],
        "current_step": "search_documents"
    }


def search_documents_node(state: AgentState) -> dict[str, Any]:
    """
    Search for relevant documents based on the user's query.
    
    RAG CRITICAL: This node MUST return evidence for generation.
    If no search results found, fallback to loading all document content.
    """
    handler = StreamingHandler(state["job_id"])
    handler.on_tool_start("search_documents")
    
    processor = get_pdf_processor()
    query = state["query"]
    relevant_docs = []
    
    # ============================================================
    # PHASE 1: Try keyword-based search
    # ============================================================
    # Extract meaningful keywords from query (remove common stopwords)
    stopwords = {'summarize', 'summarise', 'my', 'the', 'a', 'an', 'is', 'are', 'was', 'were',
                 'what', 'how', 'why', 'when', 'where', 'who', 'which', 'tell', 'me', 'about',
                 'can', 'you', 'please', 'give', 'show', 'find', 'get', 'list', 'describe', 'explain'}
    
    words = query.lower().split()
    keywords = [w for w in words if w not in stopwords and len(w) > 2]
    
    # Try searching for each keyword
    for keyword in keywords:
        results = processor.search_text(keyword, max_results=3)
        for filename, page_num, context, start, end in results:
            doc_key = (filename, page_num)
            if not any((f, p) == doc_key for f, p, _ in relevant_docs):
                relevant_docs.append((filename, page_num, context))
    
    # ============================================================
    # PHASE 2: Try filename matching
    # ============================================================
    if not relevant_docs:
        available_pdfs = processor.list_pdfs()
        for pdf in available_pdfs:
            filename_lower = pdf.filename.lower()
            # Check if any query word matches the filename
            for word in words:
                if word in filename_lower and len(word) > 2:
                    # Load first page of matching document
                    page = processor.extract_page(pdf.filename, 1)
                    if page and page.text:
                        relevant_docs.append((pdf.filename, 1, page.text[:500]))
                    break
    
    # ============================================================
    # PHASE 3: FALLBACK - Load ALL document content
    # ============================================================
    # RAG GUARANTEE: If we have PDFs but no search hits, load everything
    if not relevant_docs:
        available_pdfs = processor.list_pdfs()
        for pdf in available_pdfs:
            # Get semantic chunks from each document
            chunks = processor.get_semantic_chunks(pdf.filename, chunk_size=1000, overlap=100)
            for page_num, chunk_text in chunks[:3]:  # Limit to first 3 chunks per doc
                if chunk_text:
                    relevant_docs.append((pdf.filename, page_num, chunk_text))
        
        # If still no chunks, try extracting first page directly
        if not relevant_docs:
            for pdf in available_pdfs:
                page = processor.extract_page(pdf.filename, 1)
                if page and page.text:
                    relevant_docs.append((pdf.filename, 1, page.text[:2000]))
    
    # ============================================================
    # Create UI feedback
    # ============================================================
    info_block = None
    if relevant_docs:
        doc_count = len(set(f for f, _, _ in relevant_docs))
        info_block = UIBlock(
            type=UIBlockType.INFO_CARD,
            data=InfoCardData(
                title="📚 Documents Loaded",
                content=f"Loaded {len(relevant_docs)} section(s) from {doc_count} document(s).",
                icon="📑"
            )
        )
        handler.add_ui_block(info_block)
    else:
        # No documents at all
        info_block = UIBlock(
            type=UIBlockType.INFO_CARD,
            data=InfoCardData(
                title="📭 No Documents",
                content="No PDF documents found. Please upload documents first.",
                icon="⚠️"
            )
        )
        handler.add_ui_block(info_block)
    
    handler.on_tool_end(
        "search_documents", 
        True, 
        f"Loaded {len(relevant_docs)} sections from documents"
    )
    
    return {
        "relevant_documents": relevant_docs,
        "current_step": "extract_content",
        "ui_blocks": [info_block] if info_block else []
    }


def extract_content_node(state: AgentState) -> dict[str, Any]:
    """
    Extract detailed content from relevant PDF pages.
    """
    handler = StreamingHandler(state["job_id"])
    handler.on_tool_start("read_pdf_page")
    
    processor = get_pdf_processor()
    extracted_content = []
    
    # Extract content from each relevant page
    seen_pages = set()
    for filename, page_num, context in state["relevant_documents"][:3]:  # Limit to top 3
        page_key = (filename, page_num)
        if page_key in seen_pages:
            continue
        seen_pages.add(page_key)
        
        page = processor.extract_page(filename, page_num)
        if page:
            extracted_content.append({
                "filename": filename,
                "page": page_num,
                "text": page.text[:2000]  # Limit text length
            })
    
    handler.on_tool_end(
        "read_pdf_page", 
        True, 
        f"Extracted content from {len(extracted_content)} pages"
    )
    
    # Update messages with extracted content
    content_summary = "\n\n".join([
        f"From {c['filename']}, Page {c['page']}:\n{c['text']}"
        for c in extracted_content
    ])
    
    return {
        "messages": [HumanMessage(content=f"Extracted content:\n{content_summary}")],
        "current_step": "synthesize_answer"
    }


def synthesize_answer_node(state: AgentState) -> dict[str, Any]:
    """
    Synthesize a comprehensive answer with citations based on extracted content.
    """
    handler = StreamingHandler(state["job_id"])
    handler.on_tool_start("synthesize_answer")
    
    llm = create_llm()
    processor = get_pdf_processor()
    
    # Build context from relevant documents
    context_parts = []
    for i, (filename, page_num, context) in enumerate(state["relevant_documents"], 1):
        context_parts.append(f"[{i}] From {filename}, Page {page_num}:\n{context}")
    
    context = "\n\n".join(context_parts)
    
    system_prompt = """You are a helpful AI assistant that answers questions based on PDF documents.

    Use the provided context to answer the user's question. Include citation numbers in your response like [1], [2], etc. to reference the sources.
    
    Guidelines:
    - Be accurate and only use information from the provided context
    - Include specific citations to support your claims
    - If the context doesn't contain enough information, acknowledge this
    - Write in a clear, professional tone
    - Structure your response with paragraphs if answering complex questions"""
    
    messages = [
        SystemMessage(content=system_prompt),
        HumanMessage(content=f"Context:\n{context}\n\nUser question: {state['query']}")
    ]
    
    # Stream the response token by token
    full_response = ""
    for chunk in llm.stream(messages):
        if chunk.content:
            handler.stream_text(chunk.content)
            full_response += chunk.content
    
    handler.on_tool_end("synthesize_answer", True, "Answer generated")
    
    # Generate citations based on references in the response
    # Handle both [1] and [1, 2, 3, 4, 5] formats
    citations = []
    
    # First, find all bracket groups like [1], [1, 2], [1, 2, 3, 4, 5]
    bracket_pattern = re.compile(r'\[[\d,\s]+\]')
    bracket_matches = bracket_pattern.findall(full_response)
    
    # Extract all individual numbers from all bracket groups
    cited_numbers = set()
    for bracket in bracket_matches:
        # Extract numbers from within the bracket
        numbers = re.findall(r'\d+', bracket)
        cited_numbers.update(numbers)
    
    print(f"[AGENT] Found citation numbers in response: {cited_numbers}")
    print(f"[AGENT] relevant_documents count: {len(state['relevant_documents'])}")
    
    for num_str in cited_numbers:
        num = int(num_str)
        if 1 <= num <= len(state["relevant_documents"]):
            filename, page_num, context = state["relevant_documents"][num - 1]
            citation = processor.create_citation(
                citation_id=num,
                filename=filename,
                page_number=page_num,
                text_snippet=context[:150]
            )
            citations.append(citation)
            print(f"[AGENT] Publishing citation {num}: {filename}, page {page_num}")
            handler.add_citation(citation)
    
    return {
        "messages": [AIMessage(content=full_response)],
        "citations": citations,
        "final_response": full_response,
        "current_step": "done"
    }


def generate_ui_blocks_node(state: AgentState) -> dict[str, Any]:
    """
    Optionally generate additional UI blocks based on the response content.
    """
    handler = StreamingHandler(state["job_id"])
    ui_blocks = list(state.get("ui_blocks", []))
    
    # Check if we should generate a table based on the content
    documents = state.get("relevant_documents", [])
    if len(documents) >= 2:
        # Create a sources table
        unique_docs = {}
        for filename, page_num, _ in documents:
            if filename not in unique_docs:
                unique_docs[filename] = []
            if page_num not in unique_docs[filename]:
                unique_docs[filename].append(page_num)
        
        rows = []
        for filename, pages in unique_docs.items():
            pages_str = ", ".join(map(str, sorted(pages)[:3]))
            if len(pages) > 3:
                pages_str += f" (+{len(pages) - 3} more)"
            rows.append([filename, pages_str])
        
        if rows:
            table_block = UIBlock(
                type=UIBlockType.TABLE,
                data=TableData(
                    headers=["Document", "Relevant Pages"],
                    rows=rows,
                    caption="Sources referenced in this response"
                )
            )
            ui_blocks.append(table_block)
            handler.add_ui_block(table_block)
    
    return {
        "ui_blocks": ui_blocks,
        "current_step": "finalize"
    }


def finalize_node(state: AgentState) -> dict[str, Any]:
    """
    Finalize the response and signal completion.
    """
    handler = StreamingHandler(state["job_id"])
    handler.finish()
    
    return {
        "current_step": "complete"
    }


def error_node(state: AgentState) -> dict[str, Any]:
    """
    Handle errors in the agent execution.
    """
    handler = StreamingHandler(state["job_id"])
    error_msg = state.get("error_message") or "An unexpected error occurred"
    handler.error(error_msg, recoverable=False)
    handler.finish()
    
    return {
        "current_step": "error"
    }


# ============================================================
# Graph Construction
# ============================================================

def should_continue(state: AgentState) -> Literal["continue", "end", "error"]:
    """Determine whether to continue processing or end."""
    if state.get("error_message"):
        return "error"
    
    step = state.get("current_step", "initial")
    
    if step == "complete" or step == "error":
        return "end"
    
    return "continue"


def route_step(state: AgentState) -> str:
    """Route to the next node based on current step."""
    step = state.get("current_step", "initial")
    
    routes = {
        "initial": "analyze_query",
        "search_documents": "search_documents",
        "extract_content": "extract_content",
        "synthesize_answer": "synthesize_answer",
        "generate_ui": "generate_ui_blocks",
        "finalize": "finalize",
        "done": "generate_ui",
    }
    
    return routes.get(step, "finalize")


def create_agent_graph() -> StateGraph:
    """
    Create and compile the LangGraph agent.
    
    Returns:
        Compiled StateGraph for the search agent
    """
    # Create the graph
    workflow = StateGraph(AgentState)
    
    # Add nodes
    workflow.add_node("analyze_query", analyze_query_node)
    workflow.add_node("search_documents", search_documents_node)
    workflow.add_node("extract_content", extract_content_node)
    workflow.add_node("synthesize_answer", synthesize_answer_node)
    workflow.add_node("generate_ui_blocks", generate_ui_blocks_node)
    workflow.add_node("finalize", finalize_node)
    workflow.add_node("error", error_node)
    
    # Set entry point
    workflow.set_entry_point("analyze_query")
    
    # Add edges
    workflow.add_edge("analyze_query", "search_documents")
    workflow.add_edge("search_documents", "extract_content")
    workflow.add_edge("extract_content", "synthesize_answer")
    workflow.add_edge("synthesize_answer", "generate_ui_blocks")
    workflow.add_edge("generate_ui_blocks", "finalize")
    workflow.add_edge("finalize", END)
    workflow.add_edge("error", END)
    
    # Compile and return
    return workflow.compile()


# Create a singleton instance of the compiled graph
_agent_graph = None


def get_agent_graph():
    """Get the singleton agent graph instance."""
    global _agent_graph
    if _agent_graph is None:
        _agent_graph = create_agent_graph()
    return _agent_graph


def run_agent(job_id: str, query: str, conversation_id: str | None = None) -> AgentState:
    """
    Run the agent to process a user query.
    
    Args:
        job_id: Unique job identifier for streaming
        query: User's question/query
        conversation_id: Optional conversation ID for context
        
    Returns:
        Final agent state with response and citations
    """
    graph = get_agent_graph()
    
    initial_state: AgentState = {
        "messages": [],
        "job_id": job_id,
        "query": query,
        "relevant_documents": [],
        "citations": [],
        "ui_blocks": [],
        "current_step": "initial",
        "final_response": "",
        "error_message": None,
    }
    
    try:
        # Run the graph
        final_state = graph.invoke(initial_state)
        return final_state
    except Exception as e:
        # Handle errors gracefully
        handler = StreamingHandler(job_id)
        handler.error(str(e), recoverable=False)
        handler.finish()
        
        initial_state["error_message"] = str(e)
        initial_state["current_step"] = "error"
        return initial_state
