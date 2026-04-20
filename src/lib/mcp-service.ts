import { db, type MCP } from './db';

export interface MCPTool {
  name: string;
  description?: string;
  inputSchema: any;
}

export class MCPService {
  async registerMCP(name: string, type: 'http' | 'oauth', endpoint: string, config?: any) {
    const id = crypto.randomUUID();
    await db.mcps.add({
      id,
      name,
      type,
      endpoint,
      config
    });
    return id;
  }

  async getTools(mcpId: string): Promise<MCPTool[]> {
    const mcp = await db.mcps.get(mcpId);
    if (!mcp) throw new Error('MCP not found');

    if (mcp.type === 'http') {
      const response = await fetch(`${mcp.endpoint}/tools`, {
        headers: this.getHeaders(mcp)
      });
      const data = await response.json();
      return data.tools || [];
    }
    
    // OAuth implementation would be more complex, involving token management
    return [];
  }

  async callTool(mcpId: string, toolName: string, args: any): Promise<any> {
    const mcp = await db.mcps.get(mcpId);
    if (!mcp) throw new Error('MCP not found');

    if (mcp.type === 'http') {
      const response = await fetch(`${mcp.endpoint}/tools/call`, {
        method: 'POST',
        headers: {
          ...this.getHeaders(mcp),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: toolName,
          arguments: args
        })
      });
      const data = await response.json();
      return data.result;
    }
    
    return null;
  }

  private getHeaders(mcp: MCP): Record<string, string> {
    const headers: Record<string, string> = {};
    if (mcp.config?.apiKey) {
      headers['Authorization'] = `Bearer ${mcp.config.apiKey}`;
    }
    // Handle other auth types...
    return headers;
  }

  async getAllTools(): Promise<(ModelTool & { mcpId: string; originalName: string })[]> {
    const mcps = await db.mcps.toArray();
    let allTools: (ModelTool & { mcpId: string; originalName: string })[] = [];
    
    for (const mcp of mcps) {
      try {
        const tools = await this.getTools(mcp.id);
        allTools = allTools.concat(tools.map(t => ({
          name: `${mcp.name.replace(/\s+/g, '_')}_${t.name}`,
          originalName: t.name,
          description: t.description || '',
          parameters: t.inputSchema,
          mcpId: mcp.id 
        })));
      } catch (error) {
        console.error(`Failed to fetch tools from MCP ${mcp.name}:`, error);
      }
    }
    
    return allTools;
  }
}

import { ModelTool } from './models';

export const mcpService = new MCPService();
