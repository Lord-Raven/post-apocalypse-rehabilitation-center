class MessageNode {
    id: string; // GUID
    parentId: string | null; // GUID | null for root
    children: string[]; // GUIDs of child messages
    content: string;
    speakerId: string; // GUID of the current speaker
    presentIds: string[]; // GUIDs of present speakers
    speakerEmotions: {[key: string]: string}; // Map of speakerId to emotion

    constructor(id: string, parentId: string | null, content: string, speakerId: string, presentIds: string[], speakerEmotions: {[key: string]: string}) {
        this.id = id;
        this.parentId = parentId;
        this.children = [];
        this.content = content;
        this.speakerId = speakerId;
        this.presentIds = presentIds;
        this.speakerEmotions = speakerEmotions;
    }
}

class MessageTree {
    private nodes: Map<string, MessageNode>;
    private rootId: string | null;

    constructor() {
        this.nodes = new Map<string, MessageNode>();
        this.rootId = null;
    }

    addMessage(node: MessageNode): void {
        this.nodes.set(node.id, node);
        if (node.parentId === null) {
            this.rootId = node.id;
        } else {
            const parentNode = this.nodes.get(node.parentId);
            if (parentNode) {
                parentNode.children.push(node.id);
            }
        }
    }

    getMessage(id: string): MessageNode | undefined {
        return this.nodes.get(id);
    }

    getChildren(id: string): MessageNode[] {
        const node = this.nodes.get(id);
        if (!node) return [];
        return node.children.map(childId => this.nodes.get(childId)).filter(n => n !== undefined) as MessageNode[];
    }

    getRoot(): MessageNode | null {
        if (this.rootId) {
            return this.nodes.get(this.rootId) || null;
        }
        return null;
    }
}