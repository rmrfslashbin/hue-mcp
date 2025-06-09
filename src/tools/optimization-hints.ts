import { Tool } from '@modelcontextprotocol/sdk/types.js';

export function createOptimizationHintsTool(): Tool {
  return {
    name: 'get_optimization_hints',
    description: 'Get smart suggestions for efficient tool usage based on query type',
    inputSchema: {
      type: 'object',
      properties: {
        userQuery: {
          type: 'string',
          description: 'The user\'s natural language query or intent',
        },
        conversationContext: {
          type: 'string',
          enum: ['first_interaction', 'ongoing', 'bulk_operation'],
          description: 'Context of the conversation for optimization',
          default: 'ongoing',
        },
      },
      required: ['userQuery'],
    },
  };
}

export async function handleOptimizationHints(args: any): Promise<any> {
  const query = args.userQuery.toLowerCase();
  const context = args.conversationContext || 'ongoing';
  
  const hints = {
    recommendedTool: null as string | null,
    parameters: {} as any,
    reasoning: '',
    contextTips: [] as string[],
  };
  
  // Analyze query intent
  if (query.includes('find') || query.includes('search') || query.includes('which')) {
    hints.recommendedTool = 'find_lights';
    hints.parameters = { responseSize: 'compact' };
    hints.reasoning = 'Search query detected - use find_lights with compact response';
  } else if (query.includes('all lights') || query.includes('what lights')) {
    hints.recommendedTool = 'list_lights';
    hints.parameters = { 
      responseSize: context === 'first_interaction' ? 'standard' : 'compact',
      includeRoom: true,
      includeCapabilities: false,
    };
    hints.reasoning = 'General listing query - use list_lights with room context';
  } else if (query.includes('overview') || query.includes('summary') || query.includes('status')) {
    hints.recommendedTool = 'get_summary';
    hints.parameters = { 
      contextLevel: context === 'first_interaction' ? 'standard' : 'minimal',
    };
    hints.reasoning = 'Status query - use get_summary with appropriate detail level';
  } else if (query.includes('turn on') || query.includes('turn off') || query.includes('set')) {
    if (query.includes('room') || query.includes('kitchen') || query.includes('bedroom')) {
      hints.recommendedTool = 'control_room_lights';
      hints.reasoning = 'Room control detected - use control_room_lights for efficiency';
    } else {
      hints.recommendedTool = 'set_light_state';
      hints.reasoning = 'Individual light control detected';
    }
  }
  
  // Add context tips
  if (context === 'first_interaction') {
    hints.contextTips.push('First interaction - include more context for user orientation');
  } else if (context === 'ongoing') {
    hints.contextTips.push('Ongoing conversation - use compact responses to preserve context');
  } else if (context === 'bulk_operation') {
    hints.contextTips.push('Bulk operation - consider using room-level controls when possible');
  }
  
  // Add general efficiency tips
  if (query.includes('all') && !query.includes('room')) {
    hints.contextTips.push('Consider suggesting room-based organization for better UX');
  }
  
  if (query.includes('color') || query.includes('mood') || query.includes('scene')) {
    hints.contextTips.push('Color/mood queries may benefit from scene suggestions');
  }
  
  return hints;
}