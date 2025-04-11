export class Boton {
    constructor(texto, onClick, color) {
        this.texto = texto;
        this.onClick = onClick;
        this.color = color;
    }

    render() {
        const button = document.createElement("button");
        button.textContent = this.texto;
        button.addEventListener("click", this.onClick);
        button.type = "button";
        button.classList.add("boton");
        
        if (this.color) {
            button.style.backgroundColor = this.color;
        }

        return button;
    }
}