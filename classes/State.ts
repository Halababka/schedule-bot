class BackButtonState {
    private isBackPressed: boolean;

    constructor() {
        this.isBackPressed = false;
    }

    // Метод для установки состояния
    setBackPressed(state: boolean) {
        this.isBackPressed = state;
    }

    // Метод для получения состояния
    getBackPressed(): boolean {
        return this.isBackPressed;
    }
}

export const backButtonState = new BackButtonState();