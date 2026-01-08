document.addEventListener("DOMContentLoaded", function () {
    const numRows = 4;
    const numCols = 5;
    const numImages = 55; // total de imágenes disponibles (1..55)
    const imagesFolder = "./imagenes/";

    const gameBoard = document.getElementById("game-board");
    const colorDialog = document.getElementById("color-overlay-dialog");

    // Params de modo
    const params = new URLSearchParams(window.location.search);
    const mode = (params.get("mode") || "").trim(); // "" | "chiefs" | "play"
    const isPlayMode = mode === "play";   // jugadores: revela al tocar
    const isChiefsMode = mode === "chiefs"; // jefes: solo ve agrupadas

    let selectedImage = null;

    // Secuencia desde URL o random
    let imageSequence = getImageSequenceFromURL(numRows, numCols);
    if (!imageSequence) {
        imageSequence = createRandomImageSequence(numRows, numCols, numImages);
        updateURLWithSequence(imageSequence);
    }

    // Construir tabla
    const table = document.createElement("table");
    table.classList.add("table");

    for (let i = 0; i < numRows; i++) {
        const row = document.createElement("tr");

        for (let j = 0; j < numCols; j++) {
            const idx = i * numCols + j;

            // imageSequence contiene valores 0..(numImages-1)
            const imageIndexZeroBased = imageSequence[idx];
            const imageIndex = imageIndexZeroBased + 1; // pasa a 1..55

            const imagePath = `${imagesFolder}${imageIndex}.png`;

            const imageElement = document.createElement("img");
            imageElement.src = imagePath;
            imageElement.classList.add("img-thumbnail");

            // Guardar info
            imageElement.dataset.originalSrc = imagePath; // imagen real
            imageElement.dataset.imageId = String(imageIndex);
            imageElement.dataset.mark = "";     // marcado por host: red|blue|brown|black|""
            imageElement.dataset.role = "";     // rol real desde marks (para play/chiefs)
            imageElement.dataset.revealed = "0"; // para modo play

            imageElement.addEventListener("click", function () {
                if (isPlayMode) {
                    // ✅ MODO JUGADORES: revela según role (neutrales quedan igual)
                    revealCardForPlayers(imageElement, imagesFolder);
                    return;
                }

                if (isChiefsMode) {
                    // ✅ MODO JEFES: no marcamos (evita romper el tablero)
                    return;
                }

                // ✅ MODO HOST: permitir marcar colores
                selectedImage = imageElement;
                $(colorDialog).modal("show");
            });

            const cell = document.createElement("td");
            cell.appendChild(imageElement);
            row.appendChild(cell);
        }

        table.appendChild(row);
    }

    // IMPORTANTE: evitar duplicados si por algún motivo el script corre dos veces
    gameBoard.innerHTML = "";
    gameBoard.appendChild(table);

    // ✅ Si hay marks en la URL, cargar roles reales por carta
    applyRolesFromURLMarks(numRows, numCols);

    // Manejo de colores (solo relevante cuando se usa el selector)
    const colorOptions = document.querySelectorAll(".color-option");
    colorOptions.forEach((colorOption) => {
        colorOption.addEventListener("click", function () {
            const color = (colorOption.getAttribute("data-color") || "").trim();

            if (!selectedImage) {
                $(colorDialog).modal("hide");
                return;
            }

            if (color === "clear") {
                // quitar marca: volver a original
                selectedImage.dataset.mark = "";
                selectedImage.src = selectedImage.dataset.originalSrc || selectedImage.src;
            } else {
                // setear marca (brown = asesino en tu juego)
                selectedImage.dataset.mark = color;

                // pintado visual (overlay png de color)
                const colorImagePath = `${imagesFolder}${color}.png`;
                selectedImage.src = colorImagePath;
            }

            // ✅ CLAVE: persistir marks en la URL del host
            syncMarksToURL(numRows, numCols);

            $(colorDialog).modal("hide");
        });
    });

    // Crear botones flotantes (depende del modo)
    createFloatingButtons(isPlayMode);

    // Listener QR (siempre existe)
    const generateQRButton = document.getElementById("generate-qr-button");
    if (generateQRButton) {
        generateQRButton.addEventListener("click", function (e) {
            e.preventDefault();
            generateQRCode(numRows, numCols); // genera 2 QRs: Jefes + Jugadores
        });
    }

    // Listener Jefes (solo si el botón existe)
    const showGroupedButton = document.getElementById("show-grouped-button");
    if (showGroupedButton) {
        showGroupedButton.addEventListener("click", function (e) {
            e.preventDefault();
            showGroupedCardsModal();
        });
    }

    // Listener Instrucciones (siempre existe)
    const helpButton = document.getElementById("help-button");
    if (helpButton) {
        helpButton.addEventListener("click", function (e) {
            e.preventDefault();
            showInstructionsModal();
        });
    }

    // Debug útil (no molesta)
    if (isPlayMode) {
        const p = new URLSearchParams(window.location.search);
        const marksEncoded = (p.get("marks") || "").trim();
        if (!marksEncoded) {
            console.warn("[Relacionando] mode=play pero no hay marks=... en la URL. No se podrá revelar nada.");
        }
    }
});

/**
 * ✅ Genera una secuencia de 20 cartas SIN repetirse, tomadas de 55.
 * Devuelve índices 0..(maxImages-1) (ej: 0..54)
 */
function createRandomImageSequence(rows, cols, maxImages) {
    const totalCells = rows * cols;

    // mazo completo 0..54
    const deck = Array.from({ length: maxImages }, (_, i) => i);

    // Fisher–Yates shuffle
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }

    return deck.slice(0, totalCells);
}

function getImageSequenceFromURL(numRows, numCols) {
    const totalCells = numRows * numCols;
    const params = new URLSearchParams(window.location.search);
    const sequence = params.get("sequence");

    if (!sequence) return null;

    const sequenceArray = sequence.split(",");
    if (sequenceArray.length !== totalCells) return null;

    const parsed = sequenceArray.map((v) => Number(v)).filter((n) => Number.isFinite(n));
    if (parsed.length !== totalCells) return null;

    return parsed;
}

function updateURLWithSequence(sequence) {
    const url = new URL(window.location.href);
    url.searchParams.set("sequence", sequence.join(","));
    // no tocamos otros params (mode, marks) si existieran
    window.history.replaceState({}, document.title, url.toString());
}

/**
 * =========================
 * ✅ MARKS / ROLES
 * =========================
 *
 * marks: string de largo 20, cada char representa una carta:
 *  - r = red
 *  - b = blue
 *  - m = brown (asesino)
 *  - n = neutral
 */
function encodeMarksFromBoard() {
    const imgs = document.querySelectorAll("#game-board img.img-thumbnail");
    return Array.from(imgs)
        .map((img) => (img.dataset.mark || "").trim())
        .map((mark) => {
            if (mark === "red") return "r";
            if (mark === "blue") return "b";
            if (mark === "brown") return "m";
            // compat
            if (mark === "black") return "n";
            return "n";
        })
        .join("");
}

function decodeMarksToRoles(encoded) {
    return encoded.split("").map((ch) => {
        if (ch === "r") return "red";
        if (ch === "b") return "blue";
        if (ch === "m") return "brown";
        return ""; // neutral
    });
}

function applyRolesFromURLMarks(numRows, numCols) {
    const totalCells = numRows * numCols;
    const params = new URLSearchParams(window.location.search);
    const marksEncoded = (params.get("marks") || "").trim();

    const imgs = document.querySelectorAll("#game-board img.img-thumbnail");
    if (!imgs || imgs.length !== totalCells) return;

    if (!marksEncoded || marksEncoded.length !== totalCells) {
        imgs.forEach((img) => (img.dataset.role = ""));
        return;
    }

    const roles = decodeMarksToRoles(marksEncoded);
    imgs.forEach((img, idx) => {
        img.dataset.role = roles[idx] || "";
    });
}

function setURLParam(key, value) {
    const url = new URL(window.location.href);
    if (value === null || value === undefined || value === "") {
        url.searchParams.delete(key);
    } else {
        url.searchParams.set(key, value);
    }
    window.history.replaceState({}, document.title, url.toString());
}

function syncMarksToURL(numRows, numCols) {
    // guarda marks en la URL del HOST
    const totalCells = numRows * numCols;
    const marks = encodeMarksFromBoard();
    if (marks && marks.length === totalCells) {
        setURLParam("marks", marks);
    }
}

/**
 * ✅ Modo jugadores: al tocar, revela el color real según role.
 * Neutral: queda igual.
 * Brown: muestra brown.png (asesino).
 */
function revealCardForPlayers(imgEl, imagesFolder) {
    if (!imgEl) return;

    // Evita doble toque
    if (imgEl.dataset.revealed === "1") return;

    const role = (imgEl.dataset.role || "").trim(); // red|blue|brown|""

    // Neutral => no cambia
    if (!role) return;

    imgEl.dataset.revealed = "1";
    imgEl.src = `${imagesFolder}${role}.png`;
}

/**
 * =========================
 * ✅ BOTONES FLOTANTES
 * =========================
 * En modo play: NO mostramos botón Jefes.
 */
function createFloatingButtons(isPlayMode) {
    const floatingButton = document.getElementById("floating-button");
    if (!floatingButton) return;

    floatingButton.innerHTML = "";

    // Instrucciones (siempre)
    const helpButton = document.createElement("a");
    helpButton.id = "help-button";
    helpButton.classList.add("floating-action");
    helpButton.href = "#";
    helpButton.innerHTML = '<img src="imagenes/boton-instrucciones.png" alt="Instrucciones">';
    floatingButton.appendChild(helpButton);

    // Jefes (solo si NO es play)
    if (!isPlayMode) {
        const showGroupedButton = document.createElement("a");
        showGroupedButton.id = "show-grouped-button";
        showGroupedButton.classList.add("floating-action");
        showGroupedButton.href = "#";
        showGroupedButton.innerHTML = '<img src="imagenes/boton-jefes.png" alt="Ver cartas de jefes">';
        floatingButton.appendChild(showGroupedButton);
    }

    // QR (siempre)
    const generateQRButton = document.createElement("a");
    generateQRButton.id = "generate-qr-button";
    generateQRButton.classList.add("floating-action");
    generateQRButton.href = "#";
    generateQRButton.innerHTML = '<img src="imagenes/boton-generar-qr.png" alt="Compartir / QR">';
    floatingButton.appendChild(generateQRButton);
}

/**
 * =========================
 * ✅ QR: genera 2 QRs
 * - QR Jefes: mode=chiefs + marks=...
 * - QR Jugadores: mode=play + marks=...
 *
 * Ambos mantienen el mismo sequence.
 */
function generateQRCode(numRows, numCols) {
    const totalCells = numRows * numCols;
    const baseUrl = new URL(window.location.href);

    // ✅ Preferimos marks desde URL (sincronizado). Si no existe, lo generamos.
    let marks = (baseUrl.searchParams.get("marks") || "").trim();
    if (!marks || marks.length !== totalCells) {
        marks = encodeMarksFromBoard();
        baseUrl.searchParams.set("marks", marks);
        window.history.replaceState({}, document.title, baseUrl.toString());
    }

    // Construir URL Jefes
    const chiefsUrl = new URL(baseUrl.toString());
    chiefsUrl.searchParams.set("mode", "chiefs");
    chiefsUrl.searchParams.set("marks", marks);

    // Construir URL Jugadores
    const playUrl = new URL(baseUrl.toString());
    playUrl.searchParams.set("mode", "play");
    playUrl.searchParams.set("marks", marks);

    // QR API
    const chiefsQR = `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(
        chiefsUrl.toString()
    )}&size=220x220`;

    const playQR = `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(
        playUrl.toString()
    )}&size=220x220`;

    const qrModal = document.createElement("div");
    qrModal.classList.add("modal");
    qrModal.innerHTML = `
        <div class="modal-dialog modal-dialog-centered" role="document">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">Compartir</h5>
                    <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                        <span aria-hidden="true">&times;</span>
                    </button>
                </div>

                <div class="modal-body">
                    <p class="text-muted mb-3">
                        Generé dos QR: uno para <strong>Jefes</strong> (con botón de agrupadas) y otro para <strong>Jugadores</strong> (revela al tocar).
                    </p>

                    <div class="mb-3">
                        <div class="font-weight-bold mb-2">🧠 QR Jefes</div>
                        <div class="d-flex justify-content-center">
                            <img src="${chiefsQR}" alt="QR Jefes" />
                        </div>
                    </div>

                    <hr class="my-3" />

                    <div>
                        <div class="font-weight-bold mb-2">🎯 QR Jugadores</div>
                        <div class="d-flex justify-content-center">
                            <img src="${playQR}" alt="QR Jugadores" />
                        </div>
                    </div>

                    <hr class="my-3" />
                    <small class="text-muted d-block">
                        Las cartas <strong>neutrales</strong> quedan iguales. La carta <strong>marrón</strong> se revela como <code>brown.png</code>.
                    </small>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(qrModal);
    $(qrModal).modal("show");

    $(qrModal).on("hidden.bs.modal", function () {
        qrModal.remove();
    });
}

/**
 * =========================
 * ✅ MODAL JEFES: agrupa por color y muestra la imagen original
 * =========================
 */
function showGroupedCardsModal() {
    const allImages = document.querySelectorAll("#game-board img.img-thumbnail");

    const groups = {
        red: [],
        blue: [],
        brown: [],
        black: [], // compat
    };

    allImages.forEach((img) => {
        // ✅ Host usa mark, QR usa role
        const mark = ((img.dataset.mark || img.dataset.role) || "").trim();
        if (groups[mark]) groups[mark].push(img);
    });

    const totalMarked =
        groups.red.length + groups.blue.length + groups.brown.length + groups.black.length;

    const sectionsHTML = Object.entries(groups)
        .map(([color, imgs]) => {
            if (imgs.length === 0) return "";

            const cardsHTML = imgs
                .map((img) => {
                    const original = img.dataset.originalSrc || "";
                    return `
                        <div class="chief-card">
                            <img src="${original}" alt="Carta" />
                        </div>
                    `;
                })
                .join("");

            return `
                <div class="chief-section">
                    <div class="chief-section-title ${color}">
                        ${color.toUpperCase()} (${imgs.length})
                    </div>
                    <div class="chief-cards-grid">
                        ${cardsHTML}
                    </div>
                </div>
            `;
        })
        .join("");

    const modal = document.createElement("div");
    modal.classList.add("modal");
    modal.innerHTML = `
        <div class="modal-dialog modal-dialog-centered" role="document">
            <div class="modal-content chiefs-modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">Cartas para adivinar (Jefes)</h5>
                    <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                        <span aria-hidden="true">&times;</span>
                    </button>
                </div>
                <div class="modal-body">
                    ${
                        totalMarked === 0
                            ? `<p class="text-muted mb-0">Todavía no hay cartas marcadas.</p>`
                            : sectionsHTML
                    }
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    $(modal).modal("show");

    $(modal).on("hidden.bs.modal", function () {
        modal.remove();
    });
}

function showInstructionsModal() {
    const modal = document.createElement("div");
    modal.classList.add("modal", "fade");
    modal.setAttribute("tabindex", "-1");
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-hidden", "true");

    modal.innerHTML = `
        <div class="modal-dialog modal-dialog-centered" role="document">
            <div class="modal-content instructions-modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">Instrucciones</h5>
                    <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                        <span aria-hidden="true">&times;</span>
                    </button>
                </div>

                <div class="modal-body instructions-body">
                    <div class="instructions-intro mb-3">
                        <h6>🕵️ Operación Relacionando</h6>

                        <p>
                            Un grupo de agentes intenta comunicarse usando pistas imperfectas.<br />
                            Las imágenes del tablero representan información sensible:
                            algunas pertenecen a tu equipo, otras al equipo rival…
                            y otras no deberían tocarse jamás.
                        </p>

                        <p>
                            Los <strong>Jefes</strong> conocen la verdad detrás de cada carta,
                            pero no pueden decirla directamente.<br />
                            Solo pueden dar <strong>una palabra y un número</strong>.
                        </p>

                        <p>
                            El resto del equipo deberá interpretar, asociar y arriesgarse.
                        </p>

                        <p class="mb-0 font-italic">
                            ¿Podrán entender el mensaje correcto…<br />
                            o caerán en una trampa?
                        </p>
                    </div>

                    <p class="mb-2"><strong>Objetivo:</strong> que tu equipo adivine todas sus cartas.</p>

                    <ol class="pl-3 mb-3">
                        <li><strong>Armar equipos:</strong> 2 equipos y en cada uno un <strong>Jefe</strong>.</li>
                        <li><strong>Host:</strong> marca las cartas del tablero con colores.</li>
                        <li><strong>Turno del Jefe:</strong> da una pista como <em>“Círculo 2”</em> (una palabra + número).</li>
                        <li><strong>Equipo adivina:</strong> toca cartas que coincidan con la pista (de a una).</li>
                        <li>Las cartas <strong>neutrales</strong> no cambian.</li>
                        <li>La carta <strong>marrón</strong> es el “asesino” (se revela con <code>brown.png</code>).</li>
                    </ol>

                    <div class="instructions-tip">
                        <strong>Tip:</strong> Desde el QR de <strong>Jefes</strong> vas a poder ver las cartas agrupadas por color para planear pistas.
                    </div>

                    <hr class="my-3" />

                    <p class="mb-1"><strong>Recomendación:</strong></p>
                    <ul class="pl-3 mb-0">
                        <li>Jugá en <strong>horizontal</strong> para ver las 4 filas.</li>
                        <li>Usá el botón <strong>QR</strong> para compartir el tablero.</li>
                    </ul>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    $(modal).modal("show");

    $(modal).on("hidden.bs.modal", function () {
        modal.remove();
    });
}

// ✅ PWA: registrar service worker (solo en https o localhost)
if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
        navigator.serviceWorker.register("./sw.js").catch(console.error);
    });
}
