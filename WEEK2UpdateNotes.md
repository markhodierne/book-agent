

Learning
- problems in week 1 were actually to do with context. Writing a 30,000 word book requires some management. Even though I spawned parallel agents working on writing each of the chapters, the formatting agent failed when it tried to bring everything together!!
- performance will be helped by using a database for storage, and context engineering to ensure the whole book content is never needed all at once.
- formatting is better handled by dedicated non-LLM function - asking the LLM to output in markdown, which will be converted to Word/PDF in a subsequent step.
- the needs a RAG process - but this is a dynamic web search based on the subject of the book - it isn't a semantic search ... or is it??????
- with a multi agent system, i would build each agent in isolation and test fully before using them together - my app has been very complex to debug.
- tweaking the UI takes quite a while!!
