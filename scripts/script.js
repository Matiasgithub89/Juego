document.addEventListener("DOMContentLoaded", function () {
    const numRows = 4;
    const numCols = 5;
    const numImages = 20; // Ajusta este valor al número total de imágenes que tengas
    const imagesFolder = "imagenes/";

    const gameBoard = document.getElementById("game-board");

    // Crear una secuencia aleatoria de imágenes
    const imageIndices = createRandomImageSequence(numRows, numCols, numImages);

    // Crear una tabla para organizar las imágenes en filas y columnas
    const table = document.createElement("table");
    table.classList.add("table");

    for (let i = 0; i < numRows; i++) {
        const row = document.createElement("tr");
        for (let j = 0; j < numCols; j++) {
            const imageIndex = imageIndices[i * numCols + j] % numImages + 1;
            const imagePath = `${imagesFolder}${imageIndex}.png`;

            const imageElement = document.createElement("img");
            imageElement.src = imagePath;
            imageElement.classList.add("img-thumbnail");

            const cell = document.createElement("td");
            cell.appendChild(imageElement);
            row.appendChild(cell);
        }
        table.appendChild(row);
    }

    gameBoard.appendChild(table);
});

function createRandomImageSequence(rows, cols, maxImages) {
    const totalCells = rows * cols;
    const sequence = Array.from({ length: totalCells }, (_, index) => index);

    for (let i = sequence.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [sequence[i], sequence[j]] = [sequence[j], sequence[i]];
    }

    return sequence.slice(0, totalCells);
}
