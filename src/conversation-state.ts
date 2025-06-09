// Simple conversation state management for context optimization
interface ConversationState {
  recentRooms: Set<string>;
  recentLights: Set<string>;
  userPreferences: {
    preferredResponseSize: 'compact' | 'standard' | 'verbose';
    showRoomContext: boolean;
    showCapabilities: boolean;
  };
  interactionCount: number;
  lastToolUsed: string | null;
  commonQueries: Map<string, number>;
}

class ConversationStateManager {
  private state: ConversationState = {
    recentRooms: new Set(),
    recentLights: new Set(),
    userPreferences: {
      preferredResponseSize: 'standard',
      showRoomContext: true,
      showCapabilities: false,
    },
    interactionCount: 0,
    lastToolUsed: null,
    commonQueries: new Map(),
  };
  
  recordInteraction(toolName: string, params: any) {
    this.state.interactionCount++;
    this.state.lastToolUsed = toolName;
    
    // Track room usage
    if (params.roomId) {
      this.state.recentRooms.add(params.roomId);
    }
    
    // Track light usage
    if (params.lightId) {
      this.state.recentLights.add(params.lightId);
    }
    
    // Adapt response size based on usage
    if (this.state.interactionCount > 5) {
      this.state.userPreferences.preferredResponseSize = 'compact';
    }
  }
  
  getOptimalParameters(toolName: string, userQuery: string): any {
    const params: any = {};
    
    // Apply learned preferences
    if (toolName === 'list_lights' || toolName === 'find_lights') {
      params.responseSize = this.state.userPreferences.preferredResponseSize;
      params.includeRoom = this.state.userPreferences.showRoomContext;
      params.includeCapabilities = this.state.userPreferences.showCapabilities;
    }
    
    // Context-aware optimizations
    if (toolName === 'get_summary') {
      params.contextLevel = this.state.interactionCount > 3 ? 'minimal' : 'standard';
    }
    
    // If user frequently asks about the same things, provide compact responses
    const queryCount = this.state.commonQueries.get(userQuery.toLowerCase()) || 0;
    this.state.commonQueries.set(userQuery.toLowerCase(), queryCount + 1);
    
    if (queryCount > 2) {
      params.responseSize = 'compact';
    }
    
    return params;
  }
  
  shouldSuggestBulkOperation(): boolean {
    return this.state.recentRooms.size <= 2 && this.state.recentLights.size > 3;
  }
  
  getContextualSuggestions(): string[] {
    const suggestions: string[] = [];
    
    if (this.state.recentRooms.size > 0) {
      suggestions.push(`Recently used rooms: ${Array.from(this.state.recentRooms).join(', ')}`);
    }
    
    if (this.shouldSuggestBulkOperation()) {
      suggestions.push('Consider using room controls for multiple lights');
    }
    
    return suggestions;
  }
}

export const conversationState = new ConversationStateManager();