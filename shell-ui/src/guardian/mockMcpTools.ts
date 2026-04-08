export type MockMcpTool = {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, { type: string; description: string }>;
    required: string[];
  };
};

export const MOCK_MCP_TOOLS: MockMcpTool[] = [
  {
    name: 'getAssumableRoles',
    description: 'Returns the list of IAM roles that the current user can assume.',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
];

export type ToolArgs = Record<string, unknown>;

export const MOCK_TOOL_EXECUTORS: Record<string, (args: ToolArgs) => unknown> = {
  list_buckets: () => ({
    buckets: ['artesca-data', 'backups-prod', 'logs-2024'],
  }),
  get_object_count: (args) => ({
    bucket: args['bucket_name'],
    count: 1337,
  }),
};
