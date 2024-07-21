# Paperbaum - Parachain for Academic Papers

<div align="center">
  <img src="https://github.com/user-attachments/assets/d46c01d2-ac3a-421f-8a36-9165831f98d4" width="60%">
</div>

Paperbaum is a decentralized academic paper publishing and verification system built on a custom Substrate-based parachain. It addresses issues of authorship verification, restricted access, and inefficient paper linking in academic publishing.

Link to the slides: [here](https://www.canva.com/design/DAGLkKlpMi4/xpdo0AnDnvzOIse7Nd_f3w/edit?utm_content=DAGLkKlpMi4&utm_campaign=designshare&utm_medium=link2&utm_source=sharebutton)

## Core Components
![Screenshot 2024-07-21 at 11 23 39](https://github.com/user-attachments/assets/d7996c2a-f8c9-40d7-9cb0-980b5eeb9bc7)

* **Substrate Parachain:** Custom runtime for paper metadata storage in a merkle tree and verification.
* **IPFS Integration:** Decentralized storage for full paper content.
* **Vector Similarity Engine:** NLP-based system for semantic paper linking.
  
## Technical Features
### Substrate Parachain
The core of Paperbaum is built on a custom Substrate parachain, providing a robust and flexible foundation for academic paper management and verification. The custom pallet uses a **Merkle tree** to natively link papers together. This pallet provides functionality for:

* Managing a Merkle tree of paper hashes
* Verifying Merkle proofs
* Storing and retrieving paper metadata
* Enforcing size limits on various paper attributes

### IPFS Integration
Paperbaum leverages the InterPlanetary File System (IPFS) for decentralized storage of full paper content. This integration ensures that papers are stored in a distributed, content-addressed manner, enhancing accessibility and permanence.

### Vector Similarity Engine
Paperbaum implements a vector similarity engine for semantic paper linking. This system uses OpenAI's text embedding model to generate vector representations of papers, enabling efficient similarity searches. The `generateEmbedding` function creates a vector representation of text, while cosineSimilarity computes the similarity between two vectors.

### Paper Processing and Metadata Extraction process
When a paper is uploaded, Paperbaum processes the PDF, extracts key metadata, and generates a vector representation:
1. PDF text extraction
2. Metadata extraction using GPT4o-mini
3. Vector embedding generation
4. IPFS upload
5. Storage of metadata and vector in-memory in a merkle tree

## Images
<img src=https://github.com/user-attachments/assets/cebaa7ac-5f2e-4efb-bfa8-d3afce0734e3 width=100%>
<img src=https://github.com/user-attachments/assets/1c621f98-d9df-417e-92d7-db6a1b2354c9 width=100%>
<img src=https://github.com/user-attachments/assets/d1d4f39c-96e0-423b-9c1f-be90f3ce1a3b width=100%>



## How to Use
### Parachain
For the parachain, first compile it using

    cargo build --release

and then run

    ./target/release/node-template --dev

to run the substrate node on `127.0.0.1:9944`

### Backend
To run the backend server, enter the `backend` directory and run

    npm install

and then proceed to run

    node server.js

to run the server on `localhost:3000`

### Frontend
To run the frontend, enter the `frontend` directory and run

    npm install

and then

    npm run dev

to run the frontend on `localhost:3001`

## Roadmap
#### 1. Enhanced Merkle Tree Implementation

* Develop a more sophisticated Merkle tree structure for efficient paper linking and verification.
* Implement Merkle Mountain Ranges (MMR) for dynamic dataset management, allowing efficient updates and proofs of inclusion.

### 2. Implement zk-SNARKs for privacy-preserving paper submissions and verifications.
* Develop a ZK-based reputation system for anonymous yet credible peer reviews.
* Create ZK proofs for citation verification without revealing full paper contents.

### 3. Design a token-based incentive mechanism for peer reviewers.
* Implement double-blind review processes using ZK proofs.
* Develop a reputation system for reviewers based on the quality and timeliness of their reviews.

### 4. Implement XCM for communication with other parachains.
* Develop cross-chain citation verification and tracking.
* Create a system for recognizing academic credentials and reputations across different blockchain networks.

### 5. Use OriginTrail's Decentralized Knowledge Graph (DKG) for semantic linking of academic papers.
* Implement versioning and provenance tracking of papers using OriginTrail's blockchain-agnostic protocol.
* Develop an AI-assisted discovery system leveraging OriginTrail's semantic data structure.

## LICENSE
See [MIT License](LICENSE)
