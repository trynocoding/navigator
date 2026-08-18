export class Toast {
  constructor(region) {
    this.region = region;
    this.timer = null;
  }

  show(message, options = {}) {
    clearTimeout(this.timer);
    this.region.textContent = '';
    const toast = document.createElement('div');
    toast.className = 'toast';
    const text = document.createElement('span');
    text.textContent = message;
    toast.append(text);
    if (options.action) {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = options.label || '撤销';
      button.onclick = async () => {
        button.disabled = true;
        await options.action();
        this.dismiss();
      };
      toast.append(button);
    }
    this.region.append(toast);
    requestAnimationFrame(() => toast.classList.add('visible'));
    this.timer = setTimeout(() => this.dismiss(), options.duration || 6000);
  }

  dismiss() {
    clearTimeout(this.timer);
    this.timer = null;
    const toast = this.region.firstElementChild;
    if (!toast) return;
    toast.classList.remove('visible');
    setTimeout(() => toast.remove(), 180);
  }
}
