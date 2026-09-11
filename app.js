/**
 * Cyber-Neon Markov Chain Synthesizer Engine & UI Router
 */
// --- Layout Preset Corpora ---
const CORPORA_PRESETS = {
    shakespeare: `To be, or not to be, that is the question:
Whether 'tis nobler in the mind to suffer
The slings and arrows of outrageous fortune,
Or to take arms against a sea of troubles
And by opposing end them. To die—to sleep,
No more; and by a sleep to say we end
The heart-ache and the thousand natural shocks
That flesh is heir to: 'tis a consummation
Devoutly to be wish'd. To die, to sleep;
To sleep, perchance to dream—ay, there's the rub:
For in that sleep of death what dreams may come,
When we have shuffled off this mortal coil,
Must give us pause. There's the respect
That makes calamity of so long life.
For who would bear the whips and scorns of time,
Th' oppressor's wrong, the proud man's contumely,
The pangs of dispriz'd love, the law's delay,
The insolence of office, and the spurns
That patient merit of th' unworthy takes,
When he himself might his quietus make
With a bare bodkin? Who would fardels bear,
To grunt and sweat under a weary life,
But that the dread of something after death,
The undiscover'd country, from whose bourn
No traveller returns, puzzles the will,
And makes us rather bear those ills we have
Than fly to others that we know not of?
Thus conscience does make cowards of us all,
And thus the native hue of resolution
Is sicklied o'er with the pale cast of thought,
And enterprises of great pith and moment
With this regard their currents turn awry
And lose the name of action.`,
    science: `molecules. DNA is the molecule of life carrying genetic information in a sequence of four nucleotide bases that encode all the instructions needed to build and operate a living organism. Evolution by natural selection explains how species change over generations through the differential reproduction of organisms with heritable traits. The theory of evolution unifies all of biology just as the theory of gravity unifies the motion of objects from falling apples to orbiting planets. The scientific method involves forming hypotheses testing them through experiments and revising our understanding based on empirical evidence. Science is a self-correcting process that has produced our modern understanding of the cosmos from the smallest particles to the largest structures in the universe.`,
    news: `The global coalition of space research laboratories announced a landmark achievement in deep-space communications yesterday. Utilizing quantum entanglement modems mounted on orbital satellites, technicians successfully transmitted high-fidelity sensory data back from the Martian outpost. This marks a new milestone in planetary exploration. "We are now looking at near-zero latency command systems for outer planetary rovers," stated the program director. Meanwhile, back on Earth, sustainable fusion power grids are entering localized pilot programs. Analysts predict a massive energy sector paradigm shift before the end of the decade. The integration of advanced autonomous agents within logistics corridors has already reduced carbon footprints by thirty percent, showing promising growth indices for carbon-neutral smart cities.`,
    poetry: `O bounding waves that break upon the shore,
Sing me the song of silence evermore.
The starlight drifts across the velvet sky,
As whispers of the ancient wind float by.
We walk through fields of silver under gold,
To trace the stories that the shadows hold.
A flower blooms beneath the frozen moon,
To speak of summers that must vanish soon.
We are but echoes in the halls of time,
A fleeting rhythm in a cosmic rhyme.
So let the tides of memory arise,
And paint the crimson dawn across your eyes.`,
    tech: `The architecture relies on a highly scalable cloud-native microservices mesh. Nodes communicate via low-overhead binary protocols, processing millions of transactions per second. Our distributed consensus mechanism employs a secure, low-latency leader election algorithm to prevent database partitioning. By deploying containerized workloads closer to the network boundary, the edge servers reduce response times by seventy milliseconds. Telemetry data is pushed in real-time through WebSocket pipelines, fueling statistical forecasting algorithms. To mitigate memory overhead, our system enforces strict garbage collection limits and uses pointer pools. In the next iteration, the cluster will scale up to five hundred distributed zones automatically.`
};
// --- Markov Core Engine Class ---
// --- Markov Core Engine Class ---
class MarkovEngine {
    constructor(order = 2, tokenMode = 'word', caseSensitive = false, cleanPunctuation = true) {
        this.order = order;
        this.tokenMode = tokenMode;
        this.caseSensitive = caseSensitive;
        this.cleanPunctuation = cleanPunctuation;
        this.matrix = new Map(); // Prefix (String) -> Map(NextToken (String) -> Count (Int))
        this.vocab = new Set();
        this.tokens = [];
    }
    tokenize(text) {
        if (!text) return [];
        let processed = text;
        if (!this.caseSensitive) {
            processed = processed.toLowerCase();
        }
        if (this.tokenMode === 'word') {
            if (this.cleanPunctuation) {
                // Keep words and normalize spaces
                processed = processed
                    .replace(/[“”"']/g, "")
                    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"’—–]/g, " ")
                    .replace(/\s+/g, " ");
            } else {
                // Treat major symbols as individual tokens
                processed = processed
                    .replace(/([.,\/#!$%\^&\*;:{}=\-_`~()?"’—–])/g, " $1 ");
            }
            return processed.trim().split(/\s+/).filter(t => t.length > 0);
        } else {
            // Character-based
            if (this.cleanPunctuation) {
                processed = processed.replace(/\s+/g, " ");
            }
            return processed.split("");
        }
    }
    train(text) {
        this.matrix.clear();
        this.vocab.clear();
        this.tokens = this.tokenize(text);
        if (this.tokens.length <= this.order) {
            return false;
        }
        // Populating vocabulary
        this.tokens.forEach(t => this.vocab.add(t));
        // Training rules sliding window
        for (let i = 0; i <= this.tokens.length - this.order - 1; i++) {
            const prefix = this.tokens.slice(i, i + this.order).join(this.tokenMode === 'word' ? " " : "");
            const nextWord = this.tokens[i + this.order];
            if (!this.matrix.has(prefix)) {
                this.matrix.set(prefix, new Map());
            }
            const nextWordsMap = this.matrix.get(prefix);
            nextWordsMap.set(nextWord, (nextWordsMap.get(nextWord) || 0) + 1);
        }
        return this.matrix.size > 0;
    }
    getTransitions(prefix) {
        if (!this.matrix.has(prefix)) return [];
        const nextWordsMap = this.matrix.get(prefix);
        let totalCount = 0;
        nextWordsMap.forEach(count => totalCount += count);
        const list = [];
        nextWordsMap.forEach((count, word) => {
            list.push({
                word: word,
                count: count,
                probability: count / totalCount
            });
        });
        // Sort descending by probability
        return list.sort((a, b) => b.probability - a.probability);
    }
    predictNext(prefix, temperature = 0.7) {
        const candidates = this.getTransitions(prefix);
        if (candidates.length === 0) return null;
        // Apply temperature adjustment to probabilities
        const maxProb = Math.max(...candidates.map(c => c.probability));
        let weights = [];
        let totalWeight = 0;
        for (let cand of candidates) {
            const normalizedProb = cand.probability / maxProb;
            const weight = Math.pow(normalizedProb, 1 / temperature);
            weights.push({ word: cand.word, weight: weight });
            totalWeight += weight;
        }
        // Sampling
        let r = Math.random() * totalWeight;
        let runningSum = 0;
        for (let w of weights) {
            runningSum += w.weight;
            if (r <= runningSum) {
                return w.word;
            }
        }
        return candidates[0].word;
    }
    getRandomPrefix() {
        const keys = Array.from(this.matrix.keys());
        if (keys.length === 0) return "";
        return keys[Math.floor(Math.random() * keys.length)];
    }
}
// --- Force Directed Visualizer Engine ---
class ChainVisualizer {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.nodes = [];
        this.links = [];
        this.draggingNode = null;
        
        // Sim physics configurations
        this.repel = 300;
        this.tension = 0.06;
        this.gravity = 0.015;
        this.damping = 0.82;
        this.initEvents();
        this.resize();
        window.addEventListener('resize', () => this.resize());
    }
    resize() {
        const rect = this.canvas.parentElement.getBoundingClientRect();
        this.canvas.width = rect.width;
        this.canvas.height = rect.height;
    }
    initEvents() {
        const getMousePos = (e) => {
            const rect = this.canvas.getBoundingClientRect();
            return {
                x: e.clientX - rect.left,
                y: e.clientY - rect.top
            };
        };
        this.canvas.addEventListener('pointerdown', (e) => {
            const pos = getMousePos(e);
            
            // Find if pointer is over any node
            this.draggingNode = this.nodes.find(n => {
                const dist = Math.hypot(n.x - pos.x, n.y - pos.y);
                return dist < n.r + 5;
            }) || null;
            if (this.draggingNode) {
                this.draggingNode.fx = pos.x;
                this.draggingNode.fy = pos.y;
                
                // Clicking a node triggers the embedded stepper details panel
                if (window.app) {
                    window.app.openNodeStepper(this.draggingNode.id);
                }
            }
        });
        this.canvas.addEventListener('pointermove', (e) => {
            if (!this.draggingNode) return;
            const pos = getMousePos(e);
            this.draggingNode.x = pos.x;
            this.draggingNode.y = pos.y;
            this.draggingNode.fx = pos.x;
            this.draggingNode.fy = pos.y;
        });
        this.canvas.addEventListener('pointerup', () => {
            if (this.draggingNode) {
                this.draggingNode.fx = null;
                this.draggingNode.fy = null;
                this.draggingNode = null;
            }
        });
    }
    // Build visualization layout based on trained matrix or search queries
    setVisualizationData(engine, searchQuery = "", mode = "top10", activePrefixPath = []) {
        const width = this.canvas.width;
        const height = this.canvas.height;
        const newNodes = [];
        const newLinks = [];
        // Modes of display: "path" (rendering live generation chain) or "states" (browsing layout)
        if (activePrefixPath && activePrefixPath.length > 0) {
            // Draw generated path chain (Screenshot 3 style)
            activePrefixPath.forEach((stateWord, idx) => {
                const angle = Math.PI / 2 + (idx * 0.4) - (activePrefixPath.length * 0.2);
                const dist = 90 + idx * 45;
                const nodeX = width / 2 + Math.cos(angle) * dist;
                const nodeY = height / 2 + Math.sin(angle) * dist - 80;
                // Alternate gradient colors for nodes (Screenshot 3 colors: Pink -> Violet -> Orange -> Yellow)
                const hue = 320 - (idx * (200 / Math.max(1, activePrefixPath.length)));
                const color = `hsl(${hue}, 90%, 60%)`;
                newNodes.push({
                    id: stateWord,
                    label: stateWord,
                    x: nodeX,
                    y: nodeY,
                    vx: 0, vy: 0,
                    r: 16,
                    color: color,
                    type: idx === activePrefixPath.length - 1 ? 'head' : 'body'
                });
                if (idx > 0) {
                    newLinks.push({
                        source: activePrefixPath[idx - 1],
                        target: stateWord,
                        color: `hsl(${hue}, 85%, 50%)`,
                        width: 3
                    });
                }
            });
        } else if (mode === "top10") {
            // Draw top 10 most branched states
            const sortedStates = Array.from(engine.matrix.keys())
                .map(key => {
                    const cands = engine.getTransitions(key);
                    let sum = 0;
                    cands.forEach(c => sum += c.count);
                    return { key, count: sum, cands };
                })
                .sort((a, b) => b.count - a.count)
                .slice(0, 10);
            sortedStates.forEach((state, idx) => {
                const angle = (idx / sortedStates.length) * Math.PI * 2;
                const dist = 140;
                const nodeX = width / 2 + Math.cos(angle) * dist;
                const nodeY = height / 2 + Math.sin(angle) * dist;
                newNodes.push({
                    id: state.key,
                    label: state.key.length > 15 ? state.key.slice(0, 12) + "..." : state.key,
                    x: nodeX,
                    y: nodeY,
                    vx: 0, vy: 0,
                    r: 20,
                    color: '#00f5d4',
                    type: 'hub'
                });
                // Link to top candidate
                if (state.cands.length > 0) {
                    const topCand = state.cands[0];
                    const words = state.key.split(" ");
                    words.shift();
                    words.push(topCand.word);
                    const targetState = words.join(" ");
                    // Only link if targetState is also a valid trained prefix
                    if (engine.matrix.has(targetState)) {
                        newNodes.push({
                            id: targetState,
                            label: targetState.length > 15 ? targetState.slice(0, 12) + "..." : targetState,
                            x: nodeX + (Math.random() - 0.5) * 80,
                            y: nodeY + (Math.random() - 0.5) * 80,
                            vx: 0, vy: 0,
                            r: 16,
                            color: '#00f0ff',
                            type: 'target'
                        });
                        newLinks.push({
                            source: state.key,
                            target: targetState,
                            color: 'rgba(0, 240, 255, 0.4)',
                            width: 1.5
                        });
                    }
                }
            });
        }
        // Apply filter query search matching nodes
        if (searchQuery) {
            const query = searchQuery.toLowerCase().trim();
            this.nodes = newNodes.filter(n => n.id.toLowerCase().includes(query));
            this.links = newLinks.filter(l => 
                this.nodes.some(n => n.id === l.source) && 
                this.nodes.some(n => n.id === l.target)
            );
        } else {
            // Retain coordinate memory of existing nodes
            newNodes.forEach(node => {
                const existing = this.nodes.find(n => n.id === node.id);
                if (existing) {
                    node.x = existing.x;
                    node.y = existing.y;
                    node.vx = existing.vx;
                    node.vy = existing.vy;
                }
            });
            this.nodes = newNodes;
            this.links = newLinks;
        }
    }
    tick() {
        const width = this.canvas.width;
        const height = this.canvas.height;
        // 1. Repulsion between nodes
        for (let i = 0; i < this.nodes.length; i++) {
            const n1 = this.nodes[i];
            for (let j = i + 1; j < this.nodes.length; j++) {
                const n2 = this.nodes[j];
                const dx = n2.x - n1.x;
                const dy = n2.y - n1.y;
                const dist = Math.hypot(dx, dy) || 1;
                if (dist < 150) {
                    const force = this.repel / (dist * dist);
                    const fx = (dx / dist) * force;
                    const fy = (dy / dist) * force;
                    if (n1.fx === undefined || n1.fx === null) { n1.vx -= fx; n1.vy -= fy; }
                    if (n2.fx === undefined || n2.fx === null) { n2.vx += fx; n2.vy += fy; }
                }
            }
        }
        // 2. Link spring tension
        this.links.forEach(l => {
            const src = this.nodes.find(n => n.id === l.source);
            const dst = this.nodes.find(n => n.id === l.target);
            if (src && dst) {
                const dx = dst.x - src.x;
                const dy = dst.y - src.y;
                const dist = Math.hypot(dx, dy) || 1;
                const restDist = 70;
                const force = (dist - restDist) * this.tension;
                const fx = (dx / dist) * force;
                const fy = (dy / dist) * force;
                if (src.fx === undefined || src.fx === null) { src.vx += fx; src.vy += fy; }
                if (dst.fx === undefined || dst.fx === null) { dst.vx -= fx; dst.vy -= fy; }
            }
        });
        // 3. Central gravity and position integrations
        this.nodes.forEach(node => {
            if (node.fx !== undefined && node.fx !== null) {
                node.x = node.fx;
                node.y = node.fy;
                node.vx = 0;
                node.vy = 0;
                return;
            }
            // Pull to center
            node.vx += (width / 2 - node.x) * this.gravity;
            node.vy += (height / 2 - node.y) * this.gravity;
            // Damp velocities
            node.vx *= this.damping;
            node.vy *= this.damping;
            node.x += node.vx;
            node.y += node.vy;
            // Bounds locking
            node.x = Math.max(node.r + 5, Math.min(width - node.r - 5, node.x));
            node.y = Math.max(node.r + 5, Math.min(height - node.r - 5, node.y));
        });
    }
    draw() {
        this.tick();
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        // Draw Links
        this.links.forEach(l => {
            const src = this.nodes.find(n => n.id === l.source);
            const dst = this.nodes.find(n => n.id === l.target);
            if (src && dst) {
                this.ctx.beginPath();
                this.ctx.moveTo(src.x, src.y);
                this.ctx.lineTo(dst.x, dst.y);
                this.ctx.strokeStyle = l.color || 'rgba(0, 245, 212, 0.3)';
                this.ctx.lineWidth = l.width || 2;
                this.ctx.stroke();
                // Arrowhead
                const angle = Math.atan2(dst.y - src.y, dst.x - src.x);
                const arrowSize = 6;
                const arrowX = dst.x - Math.cos(angle) * (dst.r + 2);
                const arrowY = dst.y - Math.sin(angle) * (dst.r + 2);
                this.ctx.beginPath();
                this.ctx.moveTo(arrowX, arrowY);
                this.ctx.lineTo(arrowX - arrowSize * Math.cos(angle - Math.PI/6), arrowY - arrowSize * Math.sin(angle - Math.PI/6));
                this.ctx.lineTo(arrowX - arrowSize * Math.cos(angle + Math.PI/6), arrowY - arrowSize * Math.sin(angle + Math.PI/6));
                this.ctx.closePath();
                this.ctx.fillStyle = l.color || 'rgba(0, 245, 212, 0.5)';
                this.ctx.fill();
            }
        });
        // Draw Nodes
        this.nodes.forEach(n => {
            this.ctx.beginPath();
            this.ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
            this.ctx.fillStyle = n.color || '#00f5d4';
            this.ctx.strokeStyle = '#05070f';
            this.ctx.lineWidth = 1.5;
            this.ctx.shadowBlur = 8;
            this.ctx.shadowColor = n.color || '#00f5d4';
            this.ctx.fill();
            this.ctx.stroke();
            this.ctx.shadowBlur = 0; // reset
            // Drawing text label above/below the node (matching Screenshot 3 label position)
            this.ctx.fillStyle = '#e2e1e9';
            this.ctx.font = '500 10.5px Inter';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'top';
            this.ctx.fillText(n.label, n.x, n.y + n.r + 4);
        });
    }
}
// --- App UI Controller ---
class AppController {
    constructor() {
        this.activeOrder = 2; // Default starting order (2nd Order)
        this.engine = new MarkovEngine(this.activeOrder, 'word');
        this.visualizer = new ChainVisualizer('visualCanvas');
        this.isGenerating = false;
        
        this.bindEvents();
        
        // Train Shakespeare initially
        this.selectPreset('shakespeare');
        // Start render frame loop
        const drawLoop = () => {
            this.visualizer.draw();
            requestAnimationFrame(drawLoop);
        };
        requestAnimationFrame(drawLoop);
    }
    bindEvents() {
        // Preset clicks (Screenshot 1 deck)
        document.querySelectorAll('.preset-card').forEach(card => {
            card.addEventListener('click', (e) => {
                const presetKey = card.getAttribute('data-preset');
                
                // Toggle active card element class
                document.querySelectorAll('.preset-card').forEach(c => c.classList.remove('active'));
                card.classList.add('active');
                this.selectPreset(presetKey);
            });
        });
        // Chain Order Tabs selection (Screenshot 1 Aligned)
        document.querySelectorAll('.order-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('.order-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                
                this.activeOrder = parseInt(tab.getAttribute('data-val')) || 2;
                this.handleTrain(true); // Silent retrain on order switch
                this.showToast(`Switched to ${this.activeOrder}-order chain`);
            });
        });
        // Text area statistics counter
        const corpusArea = document.getElementById('corpusText');
        corpusArea.addEventListener('input', () => this.updateTextareaStats());
        // Clear corpus button
        document.getElementById('clearCorpusBtn').addEventListener('click', () => {
            corpusArea.value = "";
            this.updateTextareaStats();
        });
        // Tokenization Level change
        document.getElementById('tokenMode').addEventListener('change', () => {
            this.handleTrain(true); // Silent retrain on mode switch
        });
        // Train action
        document.getElementById('trainModelBtn').addEventListener('click', () => this.handleTrain());
        // Slider numbers update
        document.getElementById('outputLength').addEventListener('input', (e) => {
            document.getElementById('lengthVal').textContent = e.target.value + " words";
        });
        document.getElementById('temperature').addEventListener('input', (e) => {
            document.getElementById('tempVal').textContent = e.target.value;
        });
        // Variant selection button clicks
        document.querySelectorAll('.variant-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.variant-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            });
        });
        // Generate and download commands
        document.getElementById('generateBtn').addEventListener('click', () => this.handleGenerate());
        document.getElementById('downloadBtn').addEventListener('click', () => this.downloadOutputs());
        // Matrix full table modal triggers
        document.getElementById('showMatrixBtn').addEventListener('click', () => {
            this.populateMatrixModalTable();
            document.getElementById('matrixModal').classList.remove('hidden');
        });
        document.getElementById('closeMatrixBtn').addEventListener('click', () => {
            document.getElementById('matrixModal').classList.add('hidden');
        });
        document.getElementById('modalSearchInput').addEventListener('input', (e) => {
            this.filterMatrixModalTable(e.target.value);
        });
        // Visualization top 10 toggle
        document.getElementById('topStatesBtn').addEventListener('click', (e) => {
            document.getElementById('nodeSearchInput').value = "";
            this.visualizer.setVisualizationData(this.engine, "", "top10");
            document.querySelectorAll('.vis-filter-buttons button').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
        });
        // Search viz nodes
        document.getElementById('nodeSearchInput').addEventListener('input', (e) => {
            const query = e.target.value;
            this.visualizer.setVisualizationData(this.engine, query, "top10");
        });
        // Embedded Stepper closing
        document.getElementById('closeStepperBtn').addEventListener('click', () => {
            document.getElementById('stepperOverlay').classList.add('hidden');
        });
    }
    // Set SVG Robot Face details (Idle, training, generating)
    setRobotState(state) {
        const antenna = document.getElementById('antennaDot');
        const eyeL = document.getElementById('eyeL');
        const eyeR = document.getElementById('eyeR');
        const mouth = document.getElementById('mouth');
        const statusLabel = document.getElementById('avatarStatusLabel');
        statusLabel.textContent = state;
        if (state === 'TRAINING') {
            antenna.setAttribute('fill', '#ff0055');
            eyeL.setAttribute('rx', '5'); eyeL.setAttribute('ry', '1.5'); // squint
            eyeR.setAttribute('rx', '5'); eyeR.setAttribute('ry', '1.5');
            mouth.setAttribute('d', 'M 42 58 L 58 58'); // straight line mouth
        } else if (state === 'GENERATING') {
            antenna.setAttribute('fill', '#ff0055');
            eyeL.setAttribute('rx', '6'); eyeL.setAttribute('ry', '6'); // large eyes
            eyeR.setAttribute('rx', '6'); eyeR.setAttribute('ry', '6');
            mouth.setAttribute('d', 'M 44 56 Q 50 50 56 56'); // surprise mouth
        } else if (state === 'COMPLETED') {
            antenna.setAttribute('fill', '#00f5d4');
            eyeL.setAttribute('rx', '5'); eyeL.setAttribute('ry', '5');
            eyeR.setAttribute('rx', '5'); eyeR.setAttribute('ry', '5');
            mouth.setAttribute('d', 'M 42 56 Q 50 63 58 56'); // happy smile
        } else {
            // READY / IDLE
            antenna.setAttribute('fill', '#00f5d4');
            eyeL.setAttribute('rx', '5'); eyeL.setAttribute('ry', '5');
            eyeR.setAttribute('rx', '5'); eyeR.setAttribute('ry', '5');
            mouth.setAttribute('d', 'M 42 56 Q 50 60 58 56'); // slight smile
        }
    }
    selectPreset(key) {
        const text = CORPORA_PRESETS[key];
        if (text) {
            document.getElementById('corpusText').value = text;
            this.updateTextareaStats();
            this.handleTrain(true); // Train silently!
        }
    }
    updateTextareaStats() {
        const text = document.getElementById('corpusText').value || "";
        const charCount = text.length;
        const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
        document.getElementById('corpusStats').textContent = `${charCount.toLocaleString()} characters • ${wordCount.toLocaleString()} words`;
    }
    // Toast alert
    showToast(message) {
        const toast = document.getElementById('toast');
        toast.textContent = message;
        toast.classList.remove('hidden');
        setTimeout(() => {
            toast.classList.add('hidden');
        }, 2200);
    }
    // Training Markov engine
    handleTrain(silent = false) {
        const text = document.getElementById('corpusText').value;
        const order = this.activeOrder || 2;
        const tokenMode = document.getElementById('tokenMode').value;
        const normalize = document.getElementById('normalizePunct').checked;
        const caseSens = document.getElementById('caseSens').checked;
        if (!text.trim()) {
            if (!silent) this.showToast("Corpus text area is empty.");
            return;
        }
        if (!silent) this.setRobotState('TRAINING');
        const trainPromise = () => {
            this.engine = new MarkovEngine(order, tokenMode, caseSens, normalize);
            const ok = this.engine.train(text);
            if (ok) {
                this.setRobotState('READY');
                if (!silent) this.showToast("Model training succeeded!");
                
                // Update stats counter tags
                document.getElementById('statVocab').textContent = this.engine.vocab.size.toLocaleString();
                document.getElementById('statStates').textContent = this.engine.matrix.size.toLocaleString();
                
                let transitionCount = 0;
                this.engine.matrix.forEach(map => transitionCount += map.size);
                document.getElementById('statTransitions').textContent = transitionCount.toLocaleString();
                // Re-draw visualization defaults
                this.visualizer.setVisualizationData(this.engine, "", "top10");
                document.getElementById('nodeSearchInput').value = "";
                document.querySelectorAll('.vis-filter-buttons button').forEach(b => b.classList.remove('active'));
                document.getElementById('topStatesBtn').classList.add('active');
            } else {
                this.setRobotState('READY');
                if (!silent) alert("Training failed. Input text length is too small for the selected order.");
            }
        };
        if (silent) {
            trainPromise();
        } else {
            setTimeout(trainPromise, 600);
        }
    }
    // Generate Text Variants (Screenshot 2 and 4 layout)
    handleGenerate() {
        if (this.engine.matrix.size === 0) {
            this.showToast("Train a model first!");
            return;
        }
        this.setRobotState('GENERATING');
        
        const outputLength = parseInt(document.getElementById('outputLength').value) || 80;
        const temp = parseFloat(document.getElementById('temperature').value) || 0.7;
        const seedText = document.getElementById('seedInput').value.trim();
        const isWord = this.engine.tokenMode === 'word';
        
        // Read Variant count (1, 3, or 5)
        const variantCount = parseInt(document.querySelector('.variant-btn.active').getAttribute('data-val')) || 1;
        setTimeout(() => {
            const variants = [];
            const canvasPaths = []; // Track sequence generated in the first variant for visual paths
            for (let v = 0; v < variantCount; v++) {
                let currentPrefix = "";
                let generated = [];
                if (seedText) {
                    const tokens = this.engine.tokenize(seedText);
                    if (tokens.length >= this.engine.order) {
                        currentPrefix = tokens.slice(-this.engine.order).join(isWord ? " " : "");
                        generated = [...tokens];
                    }
                }
                if (!currentPrefix) {
                    currentPrefix = this.engine.getRandomPrefix();
                    if (isWord) {
                        generated = currentPrefix.split(" ");
                    } else {
                        generated = currentPrefix.split("");
                    }
                }
                // Loop sampling next tokens
                for (let step = 0; step < outputLength; step++) {
                    const next = this.engine.predictNext(currentPrefix, temp);
                    if (!next) break;
                    generated.push(next);
                    
                    // Slide prefix window
                    let tokens = [];
                    if (isWord) {
                        tokens = currentPrefix.split(" ");
                    } else {
                        tokens = currentPrefix.split("");
                    }
                    tokens.shift();
                    tokens.push(next);
                    currentPrefix = tokens.join(isWord ? " " : "");
                    // Keep path coordinates of first variant for graph visualization
                    if (v === 0 && step < 10) {
                        canvasPaths.push(currentPrefix);
                    }
                }
                const resultText = generated.join(isWord ? " " : "");
                variants.push(resultText);
            }
            this.setRobotState('COMPLETED');
            this.showToast(`Synthesized ${variantCount} text variants!`);
            this.displayVariants(variants, seedText);
            
            // Render the generated path on canvas (Screenshot 3 style!)
            if (canvasPaths.length > 0) {
                this.visualizer.setVisualizationData(this.engine, "", "path", canvasPaths);
                document.querySelectorAll('.vis-filter-buttons button').forEach(b => b.classList.remove('active'));
            }
            document.getElementById('downloadBtn').disabled = false;
        }, 500);
    }
    displayVariants(variants, seed) {
        const grid = document.getElementById('variantsGrid');
        grid.innerHTML = "";
        variants.forEach((vText, idx) => {
            const card = document.createElement('div');
            card.className = "variant-card glass";
            // Format copyable text
            let contentHTML = "";
            if (seed) {
                contentHTML += `<span class="seed">${seed}</span> ` + vText.slice(seed.length);
            } else {
                contentHTML += vText;
            }
            card.innerHTML = `
                <div class="variant-card-header">
                    <span>VARIANT 0${idx + 1}</span>
                    <button class="btn-icon" onclick="window.app.copySingleVariant(this)" title="Copy text"><i class="fa-solid fa-copy"></i></button>
                </div>
                <div class="variant-text">${contentHTML}</div>
            `;
            grid.appendChild(card);
        });
        document.getElementById('outputsWrapper').classList.remove('hidden');
    }
    copySingleVariant(buttonElement) {
        const text = buttonElement.parentElement.nextElementSibling.textContent;
        navigator.clipboard.writeText(text).then(() => {
            this.showToast("Copied variant text!");
        });
    }
    downloadOutputs() {
        const cards = document.querySelectorAll('.variant-text');
        if (cards.length === 0) return;
        let outputStr = "";
        cards.forEach((card, idx) => {
            outputStr += `--- VARIANT ${idx + 1} ---\n${card.textContent}\n\n`;
        });
        const blob = new Blob([outputStr], { type: "text/plain" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = "markov_synthesized_variants.txt";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        this.showToast("File downloaded!");
    }
    // Node interactive clicking: opens manual sampling stepper overlay
    openNodeStepper(statePrefix) {
        if (!this.engine.matrix.has(statePrefix)) return;
        const overlay = document.getElementById('stepperOverlay');
        const prefixText = document.getElementById('activePrefixText');
        const stepperBody = document.getElementById('stepperBody');
        prefixText.textContent = `"${statePrefix}"`;
        stepperBody.innerHTML = "";
        const transitions = this.engine.getTransitions(statePrefix);
        if (transitions.length === 0) {
            stepperBody.innerHTML = `<span class="text-muted">Dead end.</span>`;
        } else {
            transitions.forEach(cand => {
                const button = document.createElement('div');
                button.className = "step-candidate-pill";
                button.innerHTML = `
                    <span>${cand.word}</span>
                    <span class="pct">${(cand.probability * 100).toFixed(0)}%</span>
                `;
                button.addEventListener('click', () => {
                    // Update seed input to start with this prefix state + next word
                    const combined = statePrefix + " " + cand.word;
                    document.getElementById('seedInput').value = combined;
                    this.showToast(`Set starting seed to: "${combined}"`);
                    overlay.classList.add('hidden');
                });
                stepperBody.appendChild(button);
            });
        }
        overlay.classList.remove('hidden');
    }
    // Modal table list data populator
    populateMatrixModalTable() {
        const tbody = document.getElementById('modalTableBody');
        tbody.innerHTML = "";
        if (this.engine.matrix.size === 0) {
            tbody.innerHTML = `<tr><td colspan="3" class="text-center text-muted">No trained rules.</td></tr>`;
            return;
        }
        this.engine.matrix.forEach((nextMap, prefix) => {
            const tr = document.createElement('tr');
            tr.setAttribute('data-prefix', prefix);
            const cands = this.engine.getTransitions(prefix);
            let sum = 0;
            cands.forEach(c => sum += c.count);
            let pillsHtml = '<div class="pill-container">';
            cands.slice(0, 8).forEach(c => {
                pillsHtml += `
                    <span class="rule-pill" title="Counts: ${c.count}">
                        <span class="wrd">${c.word}</span>
                        <span class="pct">${(c.probability * 100).toFixed(0)}%</span>
                    </span>
                `;
            });
            if (cands.length > 8) {
                pillsHtml += `<span class="text-muted" style="align-self:center;">+${cands.length - 8}</span>`;
            }
            pillsHtml += '</div>';
            tr.innerHTML = `
                <td class="prefix-key">${prefix}</td>
                <td>${pillsHtml}</td>
                <td style="font-family:var(--font-mono);">${sum}</td>
            `;
            tbody.appendChild(tr);
        });
    }
    filterMatrixModalTable(val) {
        const q = val.toLowerCase().trim();
        const rows = document.querySelectorAll('#modalTableBody tr');
        rows.forEach(r => {
            const prefix = r.getAttribute('data-prefix');
            if (!prefix) return;
            if (prefix.toLowerCase().includes(q)) {
                r.classList.remove('hidden');
            } else {
                r.classList.add('hidden');
            }
        });
    }
}
// --- Bootstrap ---
window.addEventListener('DOMContentLoaded', () => {
    window.app = new AppController();
});