Backend README

- Default uses mock MCP (no external dependencies).
- To enable OpenAI summarization, set OPENAI_API_KEY in environment.
- To connect a real MCP server, set MCP_MODE=real and MCP_SERVER_URL to the MCP HTTP endpoint. You may need to update callMCPListEvents to match that MCP's HTTP contract.
