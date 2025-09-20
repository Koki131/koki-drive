
class LinkedList {
    constructor() {
        this.len = 0;
        this.head = null;
        this.tail = null;
        this.idToNode = {};
    }

    add(id, value, mimeType, status) {
        
        const node = new Node(id, value, mimeType, status);
        
        if (!this.idToNode[id]) {
            this.idToNode[id] = node;
        } else {
            return;
        }
        
        this.len++;
        
        if (!this.head) {
            this.head = node;
            this.tail = node;
            return;
        }

        node.prev = this.tail;
        this.tail.next = node;
        this.tail = node;

    } 

    remove(id) {

        const nodeToRemove = this.idToNode[id];

        if (!nodeToRemove) return;

        if (id === this.head.id) {
            this.head = this.head.next;
            if (this.head) this.head.prev = null;
        }
        if (id === this.tail.id) {
            this.tail = this.tail.prev;
            if (this.tail) this.tail.next = null;
        }

        if (nodeToRemove.prev) {
            nodeToRemove.prev.next = nodeToRemove.next;
        }

        if (nodeToRemove.next) {
            nodeToRemove.next.prev = nodeToRemove.prev;
        }

        delete this.idToNode[id];
        this.len--;

    }

    clone() {

        const newList = new LinkedList();

        let curr = this.head;

        while (curr) {
            newList.add(curr.id, curr.value);
            curr = curr.next;
        }

        return newList;
        
    }

    isEmpty() {
        return this.len === 0;
    }
}

class Node {
    constructor(id, value, mimeType, status) {
        this.id = id;
        this.value = value;
        this.mimeType = mimeType;
        this.status = status;
        this.next = null;
        this.prev = null;
    }
}

export default LinkedList;