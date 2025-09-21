# Book Agent

The Book Agent application should be capable of creating a fully fleshed-out book of 30,000+ words from a user-provided prompt. The prompt may be minimal (a few words) or include starter content such as text files or PDFs.

The application should follow these key functional requirements:

## 1. User Interaction and Understanding

- Engage the user in a conversation to clarify the subject, scope, and goals of the book.
- Collect details about the target audience, including:
    - Who the readers are
    - Their prior knowledge or expertise level
    - Age brackets (if applicable)
- Summarize and confirm the agent’s understanding of the audience with the user.
- Ask for the author’s name.
- Collect information about the desired writing style. After receiving this, the agent should provide multiple style samples for the user to choose from.
- Provide suggestions on how to orient or slant the content to maximize reader engagement.


## 2. Book Creation Workflow

The book creation should follow a staged process, coordinated by the main orchestration agent:

### Stage 1 – Outline Creation

- Using the user’s prompt, starter content, audience, and style:
    - Generate a book title.
    - Create a detailed book outline with a chapter-by-chapter breakdown. Each chapter summary should include:
        - Content overview
        - Suggested word length
        - Key objectives
- Document the agreed audience details and writing style in the outline.
- The outline must be comprehensive enough to allow independent chapter creation by sub-agents.

### Stage 2 – Chapter Writing

- For each chapter, the orchestration agent should:
    - Spawn sub-agents dedicated to one chapter each.
    - Each sub-agent performs:
        - Research: Gather relevant content and references.
        - Writing: Produce the chapter in accordance with instructions from the orchestration agent.

### Stage 3 – Quality Review

- Review the complete book for:
    - Consistency of style and quality
    - Logical flow of content from chapter to chapter
    - Alignment with the target audience
    - Opportunities to improve content to achieve a world-class standard
    - Accuracy, factual correctness, and currency of information
    - Spelling and grammar (use standard US English)
- Generate a task list of required revisions and instruct sub-agents to update content as needed.

### Stage 4 – Formatting and Design

- Once the content passes quality review:
    - Create a formatted PDF of the book.
    - Generate a cover image (front and back) that is visually striking and appropriate to the content.
    - Include the front cover as the first page and the back cover as the last page of the PDF.

### Stage 5 – User Feedback and Revisions

- Deliver the PDF to the user and collect feedback.
- Make revisions iteratively until the user is satisfied.


## Notes for Implementation

- Every interaction with the user and every stage of the workflow should be well-structured and traceable, so sub-agents can operate independently but still align with the main orchestration agent.
- Ensure that the system tracks audience, style, and scope consistently throughout the process.


## Technology Stack

This is a TypeScript AI agent application based on a cloned template repository.

NOTE: The starter template that we are using for this project may need some modification for our chosen technology stack. For example: we are using OpenAI's Agents SDK NOT Vercel's AI SDK.

The app will use the following technologies:

| Purpose                  | Technology                       | Notes / Link |
|---------------------------|---------------------------------|--------------|
| LLM for text generation   | OpenAI GPT-5 mini               | Default parameters: reasoning_effort='Low', verbosity='High'. Configurable per agent. [Docs](https://platform.openai.com/docs/guides/latest-model) |
| Full-stack framework      | Next.js                          | React-based framework for frontend and backend. [Next.js](https://nextjs.org/) |
| Deployment                | Vercel                           | Hosting and deployment. [Vercel](https://vercel.com/) |
| Agent orchestration       | OpenAI Agents SDK (TypeScript)   | Orchestrates main agent and sub-agent workflows. [Docs](https://openai.github.io/openai-agents-js/) |
| UI components             | shadcn/ui                        | Pre-built, customizable UI components. [Docs](https://ui.shadcn.com/) |
| Web scraping              | Firecrawl Scrape                 | Collect external research content. [Docs](https://docs.firecrawl.dev/features/scrape) |

**Guidelines:**
- Make full use of the OpenAI Agents SDK to design the workflow as simply as possible.
- Configure LLM parameters per agent as needed to match specific tasks.