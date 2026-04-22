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

  // Completes OAuth registration by exchanging code for tokens
  async completeOAuthRegistration(mcpId: string, code: string): Promise<void> {
    const mcp = await db.mcps.get(mcpId);
    if (!mcp || mcp.type !== 'oauth') throw new Error('Invalid MCP for OAuth');
    
    if (!mcp.config?.tokenUrl || !mcp.config?.clientId || !mcp.config?.clientSecret) {
      throw new Error('OAuth configuration incomplete');
    }

    const response = await fetch(mcp.config.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: mcp.config.clientId || '',
        client_secret: mcp.config.clientSecret || '',
        ...(mcp.config.redirectUri ? { redirect_uri: mcp.config.redirectUri } : {})
      }).toString()
    });

    if (!response.ok) {
      throw new Error('Failed to exchange authorization code');
    }

    const data = await response.json();
    
    mcp.config = {
      ...mcp.config,
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: data.expires_in ? Date.now() + data.expires_in * 1000 : undefined
    };

    await db.mcps.update(mcpId, { config: mcp.config });
  }

  private async refreshTokenIfNeeded(mcp: MCP): Promise<void> {
    if (mcp.type !== 'oauth' || !mcp.config?.refreshToken || !mcp.config?.tokenUrl) return;

    // Check if token is expired (or about to expire in next 60s)
    if (mcp.config.expiresAt && Date.now() > mcp.config.expiresAt - 60000) {
      const response = await fetch(mcp.config.tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: mcp.config.refreshToken || '',
          client_id: mcp.config.clientId || '',
          client_secret: mcp.config.clientSecret || ''
        }).toString()
      });

      if (response.ok) {
        const data = await response.json();
        mcp.config.accessToken = data.access_token;
        if (data.refresh_token) mcp.config.refreshToken = data.refresh_token;
        if (data.expires_in) mcp.config.expiresAt = Date.now() + data.expires_in * 1000;
        
        await db.mcps.update(mcp.id, { config: mcp.config });
      } else {
        console.error(`Failed to refresh OAuth token for MCP ${mcp.name}`);
      }
    }
  }

  async getTools(mcpId: string): Promise<MCPTool[]> {
    const mcp = await db.mcps.get(mcpId);
    if (!mcp) throw new Error('MCP not found');

    if (mcp.type === 'http' || mcp.type === 'oauth') {
      if (mcp.type === 'oauth') await this.refreshTokenIfNeeded(mcp);

      const response = await fetch(`${mcp.endpoint}/tools`, {
        headers: this.getHeaders(mcp)
      });
      const data = await response.json();
      return data.tools || [];
    }
    
    return [];
  }

  async callTool(mcpId: string, toolName: string, args: any): Promise<any> {
    const mcp = await db.mcps.get(mcpId);
    if (!mcp) throw new Error('MCP not found');

    if (mcp.type === 'http' || mcp.type === 'oauth') {
      if (mcp.type === 'oauth') await this.refreshTokenIfNeeded(mcp);

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
    if (mcp.type === 'oauth' && mcp.config?.accessToken) {
      headers['Authorization'] = `Bearer ${mcp.config.accessToken}`;
    } else if (mcp.config?.apiKey) {
      headers['Authorization'] = `Bearer ${mcp.config.apiKey}`;
    }
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
