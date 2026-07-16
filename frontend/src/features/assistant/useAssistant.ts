import { useContext } from 'react';
import { AssistantContext } from './assistantContext';

export function useAssistant() {
    const context = useContext(AssistantContext);
    if (context === null) {
        throw new Error('useAssistant must be used within an AssistantProvider');
    }
    return context;
}
