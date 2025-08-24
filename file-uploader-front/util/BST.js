
class BST {
    constructor(size) {
        this.root = null;
        this.size = size;
        this.len = 0;
        this.fileValues = {};
        this.nextCursor = null;
    }


    clone(newSize) {

        let newTree = new BST(this.size);

        if (newSize) {
            newTree = new BST(newSize);
        } 

        this.cloneUtil(this.root, newTree);
        return newTree;
    }

    cloneUtil(curr, newTree) {

        if (!curr) return newTree;
        
        newTree.add(curr.file);
        this.cloneUtil(curr.left, newTree);
        this.cloneUtil(curr.right, newTree);

        return newTree;
    }

    find(node) {
        return this.search(new FileWrapper(node), this.root);
    }

    search(node, curr) {

        if (!curr) return null;

        if (this.compare(node, curr) > 0) {
            return this.search(node, curr.right);
        } else if (this.compare(node, curr) < 0) {
            return this.search(node, curr.left);
        } else {
            return curr.file;
        }

    }

    getMinOnRight(node) {

        let curr = node;
        
        while (curr.left) {
            curr = curr.left;
        }

        return curr;

    }

    findMax(node) {
        let curr = node;

        while (curr && curr.right) {
            curr = curr.right;
        }

        return curr;
    }

    insert(fileWrapper, curr) {

        if (!curr) {
            return fileWrapper;
        }

        if (this.compare(fileWrapper, curr) > 0) {
            curr.right = this.insert(fileWrapper, curr.right);
        } else {
            curr.left = this.insert(fileWrapper, curr.left);
        }

        curr.height = Math.max(this.height(curr.left), this.height(curr.right)) + 1;

        
        return this.rotate(curr);

    }

    add(file) {

        const newFile = new FileWrapper(file);
        
        if (this.len >= this.size) {            
            return;
        }

        this.fileValues[file.id] = file;
        this.root = this.insert(newFile, this.root);
        this.len++;

    }

    delete(nodeToRemove) {
        console.log(nodeToRemove);
        
        this.root = this.remove(new FileWrapper(nodeToRemove), this.root);
        delete this.fileValues[nodeToRemove.id];
        if (this.len > 0) this.len--;
    }

    remove(nodeToRemove, curr) {
        
        if (!curr) return null;

        if (this.compare(nodeToRemove, curr) > 0) {
            curr.right = this.remove(nodeToRemove, curr.right);
        } else if (this.compare(nodeToRemove, curr) < 0) {
            curr.left = this.remove(nodeToRemove, curr.left);
        } else {

            if (!curr.left || !curr.right) {

                const tmp = curr.left ? curr.left : curr.right;

                if (!tmp) {
                    curr = null;
                } else {
                    curr = tmp;
                }

            } else {

                const min = this.getMinOnRight(curr.right);

                if (min) {
                    curr.file = min.file;
                }

                curr.right = this.remove(min, curr.right);


            }

        }

        if (!curr) return null;

        curr.height = Math.max(this.height(curr.left), this.height(curr.right)) + 1;


        return this.rotate(curr);
    }

    rotate(node) {
        
        if (this.getBalance(node) > 1) {

            if (this.getBalance(node.left) > 0) {
                return this.rightRotate(node);
            } 

            if (this.getBalance(node.left) < 0) {
                return this.rotateLeftRight(node);
            }
        }

        if (this.getBalance(node) < -1) {
            
            if (this.getBalance(node.right) < 0) {
                return this.leftRotate(node);
            } 

            if (this.getBalance(node.right) > 0) {
                return this.rotateRightRight(node);
            }

        }

        return node;
    }

    getBalance(node) {
        if (!node) return 0;
        return this.height(node.left) - this.height(node.right);
    }

    leftRotate(x) {

        let y = x.right;
        let t = y.left;

        y.left = x;
        x.right = t;

        x.height = 1 + Math.max(this.height(x.left), this.height(x.right)); 
        y.height = 1 + Math.max(this.height(y.left), this.height(y.right)); 

        return y;

    }

    rightRotate(x) {

        let y = x.left;
        let t = y.right;
        
        y.right = x;
        x.left = t;

        x.height = 1 + Math.max(this.height(x.left), this.height(x.right)); 
        y.height = 1 + Math.max(this.height(y.left), this.height(y.right)); 

        return y;

    }

    rotateLeftRight(node) {
        node.left = this.leftRotate(node.left);
        return this.rightRotate(node);
    }

    rotateRightRight(node) {
        node.right = this.rightRotate(node.right);
        return this.leftRotate(node);
    }

    height(node) {
        if (!node) return -1;

        return node.height;
    }

    getInOrder() {
        return this.traverse(this.root, []);
    }

    traverse(curr, res) {
        
        if (!curr) return res;

        this.traverse(curr.left, res);
        res.push(curr.file);
        this.traverse(curr.right, res);
        
        return res;

    }

    getReverseOrder() {
        return this.traverseInverse(this.root, []);
    }
    
    traverseInverse(curr, res) {
        
        if (!curr) return res;

        this.traverseInverse(curr.right, res);
        res.push(curr.file);
        this.traverseInverse(curr.left, res);

        return res;

    }

    compare(wrapperA, wrapperB) {
        const fileA = wrapperA.file;
        const fileB = wrapperB.file;
        
        if (fileA.type !== fileB.type) {
            return fileA.type === 'FOLDER' ? -1 : 1;
        }

        const nameComparison = fileA.name.localeCompare(fileB.name);
        
        // if (nameComparison !== 0) 
        return nameComparison;


        // return fileA.id - fileB.id;
    }


}

class FileWrapper {
    constructor(file) {
        this.file = file;
        this.left = null;
        this.right = null;
        this.height = 0;
    }
}

export { BST, FileWrapper };