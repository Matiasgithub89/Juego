document.addEventListener("DOMContentLoaded", function () {
    const numRows = 4;
    const numCols = 5;
    const numImages = 55; // total de imágenes disponibles (1..55)
    const imagesFolder = "./imagenes/";

    const gameBoard = document.getElementById("game-board");
    const colorDialog = document.getElementById("color-overlay-dialog");

    let selectedImage = null;

    // Secuencia desde URL o random
    let imageSequence = getImageSequenceFromURL();
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
            // ✅ imageSequence ahora contiene valores 0..(numImages-1)
            const imageIndexZeroBased = imageSequence[i * numCols + j];
            const imageIndex = imageIndexZeroBased + 1; // pasa a 1..55

            const imagePath = `${imagesFolder}${imageIndex}.png`;

            const imageElement = document.createElement("img");
            imageElement.src = imagePath;
            imageElement.classList.add("img-thumbnail");

            // ✅ Guardar info para “Jefes”
            imageElement.dataset.originalSrc = imagePath; // imagen real
            imageElement.dataset.imageId = String(imageIndex);
            imageElement.dataset.mark = ""; // red|blue|brown|black|"" (sin marca)

            imageElement.addEventListener("click", function () {
                selectedImage = imageElement;
                // mostramos el modal bootstrap
                $(colorDialog).modal("show");
            });

            const cell = document.createElement("td");
            cell.appendChild(imageElement);
            row.appendChild(cell);
        }

        table.appendChild(row);
    }

    gameBoard.appendChild(table);

    // Manejo de colores
    const colorOptions = document.querySelectorAll(".color-option");
    colorOptions.forEach((colorOption) => {
        colorOption.addEventListener("click", function () {
            const color = colorOption.getAttribute("data-color");

            if (!selectedImage) {
                $(colorDialog).modal("hide");
                return;
            }

            if (color === "clear") {
                // ✅ quitar marca: volver a original
                selectedImage.dataset.mark = "";
                selectedImage.src = selectedImage.dataset.originalSrc || selectedImage.src;
            } else {
                // ✅ setear marca
                selectedImage.dataset.mark = color;

                // pintado como lo venías haciendo (cambia el src por el png de color)
                const colorImagePath = `${imagesFolder}${color}.png`;
                selectedImage.src = colorImagePath;
            }

            $(colorDialog).modal("hide");
        });
    });

    // Crear botones flotantes (QR + Jefes)
    if (imageSequence !== null) {
        createFloatingButtons();
    }

    // Listener QR
    const generateQRButton = document.getElementById("generate-qr-button");
    generateQRButton.addEventListener("click", function (e) {
        e.preventDefault();
        generateQRCode();
    });

    // Listener Jefes
    const showGroupedButton = document.getElementById("show-grouped-button");
    showGroupedButton.addEventListener("click", function (e) {
        e.preventDefault();
        showGroupedCardsModal();
    });
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

    // tomamos las primeras 20
    return deck.slice(0, totalCells);
}

function getImageSequenceFromURL() {
    const url = window.location.href;
    const queryString = url.split("?")[1];

    if (queryString) {
        const params = new URLSearchParams(queryString);
        const sequence = params.get("sequence");

        if (sequence) {
            const sequenceArray = sequence.split(",");
            if (sequenceArray.length === 20) {
                // OJO: acá llegan números 0..54 (nuevo formato)
                return sequenceArray.map((v) => Number(v));
            }
        }
    }
    return null;
}

function updateURLWithSequence(sequence) {
    const sequencePart = sequence.join(",");
    window.history.replaceState({}, document.title, `./?sequence=${sequencePart}`);
}

// ✅ Botones flotantes: Jefes + QR
function createFloatingButtons() {
    const floatingButton = document.getElementById("floating-button");
    floatingButton.innerHTML = "";

    // Botón Jefes
    const showGroupedButton = document.createElement("a");
    showGroupedButton.id = "show-grouped-button";
    showGroupedButton.classList.add("floating-action");
    showGroupedButton.href = "#";
    showGroupedButton.innerHTML = '<img src="imagenes/boton-jefes.png" alt="Ver cartas de jefes">';
    floatingButton.appendChild(showGroupedButton);

    // Botón QR
    const generateQRButton = document.createElement("a");
    generateQRButton.id = "generate-qr-button";
    generateQRButton.classList.add("floating-action");
    generateQRButton.href = "#";
    generateQRButton.innerHTML = '<img src="imagenes/boton-generar-qr.png" alt="Generar Código QR">';
    floatingButton.appendChild(generateQRButton);
}

// QR
function generateQRCode() {
    const currentURL = window.location.href;
    const qrAPIURL = `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(currentURL)}&size=200x200`;

    const qrImage = document.createElement("img");
    qrImage.src = qrAPIURL;

    const qrModal = document.createElement("div");
    qrModal.classList.add("modal");
    qrModal.innerHTML = `
        <div class="modal-dialog modal-dialog-centered" role="document">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">Compartir Tablero</h5>
                    <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                        <span aria-hidden="true">&times;</span>
                    </button>
                </div>
                <div class="modal-body d-flex justify-content-center align-items-center"></div>
            </div>
        </div>
    `;

    qrModal.querySelector(".modal-body").appendChild(qrImage);

    document.body.appendChild(qrModal);
    $(qrModal).modal("show");

    // Limpieza cuando se cierra
    $(qrModal).on("hidden.bs.modal", function () {
        qrModal.remove();
    });
}

// ✅ Modal Jefes: agrupa por color y muestra la imagen original
function showGroupedCardsModal() {
    const allImages = document.querySelectorAll("#game-board img.img-thumbnail");

    const groups = {
        red: [],
        blue: [],
        brown: [],
        black: [],
    };

    allImages.forEach((img) => {
        const mark = (img.dataset.mark || "").trim();
        if (groups[mark]) {
            groups[mark].push(img);
        }
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

    // Limpieza cuando se cierra
    $(modal).on("hidden.bs.modal", function () {
        modal.remove();
    });
}
