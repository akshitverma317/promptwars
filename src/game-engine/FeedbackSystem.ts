interface FloatingText {
    id: string;
    x: number;
    y: number;
    text: string;
    color: string;
    life: number; // 0 to 1
    velocity: { x: number; y: number };
    size: number;
}

export class FeedbackSystem {
    texts: FloatingText[] = [];

    constructor() { }

    spawn(x: number, y: number, text: string, color: string = '#fff') {
        this.texts.push({
            id: crypto.randomUUID(),
            x,
            y,
            text,
            color,
            life: 1.0,
            velocity: { x: (Math.random() - 0.5) * 1, y: -2 }, // Float up
            size: 20
        });
    }

    update() {
        for (let i = this.texts.length - 1; i >= 0; i--) {
            const t = this.texts[i];
            t.x += t.velocity.x;
            t.y += t.velocity.y;
            t.life -= 0.015;

            if (t.life <= 0) {
                this.texts.splice(i, 1);
            }
        }
    }

    draw(ctx: CanvasRenderingContext2D) {
        ctx.save();
        ctx.font = 'bold 20px "Comic Sans MS", "Chalkboard SE", sans-serif'; // Comic font for fun
        ctx.textAlign = 'center';

        for (const t of this.texts) {
            ctx.globalAlpha = t.life;
            ctx.fillStyle = t.color;
            ctx.shadowColor = '#000';
            ctx.shadowBlur = 4;
            ctx.lineWidth = 2;
            ctx.strokeStyle = '#000';

            // cute bounce effect based on life
            const scale = 1 + Math.sin(t.life * Math.PI) * 0.2;

            ctx.translate(t.x, t.y);
            ctx.scale(scale, scale);
            ctx.strokeText(t.text, 0, 0);
            ctx.fillText(t.text, 0, 0);
            ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset transform
        }
        ctx.restore();
    }
}
