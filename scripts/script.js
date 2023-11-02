document.addEventListener("DOMContentLoaded", function () {
    const numRows = 4;
    const numCols = 5;
    const numImages = 20; // Ajusta este valor al número total de imágenes que tengas
    const imagesFolder = "./imagenes/";
  
    const gameBoard = document.getElementById("game-board");
    const colorDialog = document.getElementById("color-overlay-dialog");
  
    let selectedImage = null; // Para rastrear la imagen seleccionada
  
    // Obtener la secuencia de imágenes de la URL o generar una secuencia aleatoria
    let imageSequence = getImageSequenceFromURL();
    if (!imageSequence) {
      imageSequence = createRandomImageSequence(numRows, numCols, numImages);
      // Actualizar la URL con la secuencia generada
      updateURLWithSequence(imageSequence);
    }
  
    // Crear una tabla para organizar las imágenes en filas y columnas
    const table = document.createElement("table");
    table.classList.add("table");
  
    for (let i = 0; i < numRows; i++) {
      const row = document.createElement("tr");
      for (let j = 0; j < numCols; j++) {
        const imageIndex = (imageSequence[i * numCols + j] % numImages) + 1;
        const imagePath = `${imagesFolder}${imageIndex}.png`;
  
        const imageElement = document.createElement("img");
        imageElement.src = imagePath;
        imageElement.classList.add("img-thumbnail");
  
        // Asociar evento de clic para mostrar el cuadro de diálogo emergente
        imageElement.addEventListener("click", function () {
          selectedImage = imageElement; // Rastrear la imagen seleccionada
          colorDialog.style.display = "block"; // Mostrar el cuadro de diálogo emergente
        });
  
        const cell = document.createElement("td");
        cell.appendChild(imageElement);
        row.appendChild(cell);
      }
      table.appendChild(row);
    }
  
    gameBoard.appendChild(table);
  
    // Configurar el manejo de eventos para las opciones de color
    const colorOptions = document.querySelectorAll(".color-option");
    colorOptions.forEach((colorOption) => {
      colorOption.addEventListener("click", function () {
        const color = colorOption.getAttribute("data-color");
        if (selectedImage) {
          const colorImagePath = `${imagesFolder}${color}.png`; // Cambiar al nombre del archivo de color deseado
          selectedImage.src = colorImagePath;
        }
        colorDialog.style.display = "none"; // Cerrar el cuadro de diálogo emergente
      });
    });
  
    // Configurar el manejo de eventos para cerrar el cuadro de diálogo emergente
    const closeButton = colorDialog.querySelector(".close");
    closeButton.addEventListener("click", function () {
      colorDialog.style.display = "none"; // Cerrar el cuadro de diálogo emergente
    });
  
    // Llamar a la función para crear el botón y configurar el evento de clic
    createGenerateQRButton(imageSequence);
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
  
  function getImageSequenceFromURL() {
    // Obtén la parte de la URL después de "?"
    const url = window.location.href;
    const queryString = url.split("?")[1];
  
    if (queryString) {
      // Parsea los parámetros de consulta en un objeto
      const params = new URLSearchParams(queryString);
      const sequence = params.get("sequence");
  
      if (sequence) {
        // Convierte la secuencia en un array
        const sequenceArray = sequence.split(",");
  
        if (sequenceArray.length === 20) {
          // Convierte elementos de la secuencia a números
          return sequenceArray.map(Number);
        }
      }
    }
    return null;
  }
  
  function updateURLWithSequence(sequence) {
    const sequencePart = sequence.join(",");
    // Actualiza la URL con la secuencia como parámetro de consulta
    window.history.replaceState(
      {},
      document.title,
      `./?sequence=${sequencePart}`
    );
  }
  
  function createGenerateQRButton(imageSequence) {
    // Comprueba si el botón ya existe antes de crearlo
    if (!document.getElementById("generate-qr-button") && imageSequence) {
      // Crea el botón de "Generar Código QR" si la secuencia está presente
      const generateQRButton = document.createElement("a");
      generateQRButton.href = "#";
      generateQRButton.id = "generate-qr-button";
      generateQRButton.innerHTML = '<img src="imagenes/boton-generar-qr.png" alt="Generar Código QR">';
      generateQRButton.addEventListener("click", generateQRCode);
      document.body.appendChild(generateQRButton);
    }
  }
  
  function generateQRCode() {
    // Obtener la URL actual con la secuencia
    const currentURL = window.location.href;
    // Crear una URL para la API de generación de códigos QR
    const qrAPIURL = `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(currentURL)}&size=200x200`;
  
    // Crear una imagen con el código QR
    const qrImage = document.createElement("img");
    qrImage.src = qrAPIURL;
  
    // Crear un div para mostrar la imagen en el modal
    const qrModal = document.createElement("div");
    qrModal.classList.add("modal");
    qrModal.innerHTML = '<div class="modal-dialog"><div class="modal-content"><div class="modal-header"><h5 class="modal-title">Código QR</h5><button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button></div><div class="modal-body"></div></div></div>';
    qrModal.querySelector(".modal-body").appendChild(qrImage);
  
    // Agregar el modal al documento y mostrarlo
    document.body.appendChild(qrModal);
    $(qrModal).modal("show");
  }
  