export class Toast {
    constructor(...message) {
        this.message = message;
    }

    render() {
        const toast = document.createElement("div");
        toast.id = "div-toast";
        toast.textContent = this.message;

        toast.classList.add("toast");

        setTimeout(() => {
            toast.style.opacity = 0;
            toast.style.transform = "translateY(20px)";
            toast.style.transition = "opacity 0.3s ease-out"
            setTimeout(() => {
                toast.remove();
            }, 1000);
        }, 1500);

        return toast;
    }

}

// const toast = new Toast("Hola mundo");
// document.body.appendChild(toast.render());

// const toast2 = new Toast("Chao mundo");
// document.body.appendChild(toast2.render());