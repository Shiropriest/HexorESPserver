// Z�sk�n� referenc� na prvky
const modal = document.getElementById('myModal');
const openModalBtn = document.getElementById('openModalBtn');
const closeModalBtn = document.getElementsByClassName('close')[0];
const confirmBtn = document.getElementById('confirmBtn');
const toggleBtn = document.getElementById('toggleBtn');
const inputField1 = document.getElementById('SSID');
const inputField2 = document.getElementById('PASS');
const outputField = document.getElementById('outputField');

// Funkce pro otev�en� mod�ln�ho okna
openModalBtn.onclick = function () {
    modal.style.display = 'block';
}

// Funkce pro zav�en� mod�ln�ho okna
closeModalBtn.onclick = function () {
    modal.style.display = 'none';
}

// Funkce pro potvrzen� vstupu
confirmBtn.onclick = function () {
    const inputValue = inputField.value;
    outputField.textContent = `Zadan� text: ${inputValue}`;
}

// Funkce pro p�ep�n�n� textu
toggleBtn.onclick = function () {
    const inputValue = inputField.value;
    const reversedText = inputValue.split('').reverse().join('');
    inputField.value = reversedText;
}
