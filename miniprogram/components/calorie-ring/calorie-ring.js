Component({
  properties: {
    current: { type: Number, value: 0 },
    target: { type: Number, value: 2000 }
  },

  observers: {
    'current, target': function () {
      this.drawRing();
    }
  },

  lifetimes: {
    ready() {
      this.drawRing();
    }
  },

  methods: {
    drawRing() {
      const query = this.createSelectorQuery();
      query.select('#calorieRing')
        .fields({ node: true, size: true })
        .exec((res) => {
          if (!res[0]) return;
          const canvas = res[0].node;
          const ctx = canvas.getContext('2d');
          const dpr = wx.getSystemInfoSync().pixelRatio;
          canvas.width = res[0].width * dpr;
          canvas.height = res[0].height * dpr;
          ctx.scale(dpr, dpr);

          const w = res[0].width;
          const h = res[0].height;
          const cx = w / 2;
          const cy = h / 2;
          const radius = Math.min(w, h) / 2 - 16;
          const lineWidth = 16;
          const percent = Math.min(this.data.current / this.data.target, 1);

          ctx.clearRect(0, 0, w, h);

          // 背景圆环
          ctx.beginPath();
          ctx.arc(cx, cy, radius, 0, Math.PI * 2);
          ctx.strokeStyle = '#F0F0F0';
          ctx.lineWidth = lineWidth;
          ctx.lineCap = 'round';
          ctx.stroke();

          // 进度圆环
          if (percent > 0) {
            const startAngle = -Math.PI / 2;
            const endAngle = startAngle + Math.PI * 2 * percent;
            ctx.beginPath();
            ctx.arc(cx, cy, radius, startAngle, endAngle);

            const gradient = ctx.createLinearGradient(0, 0, w, h);
            gradient.addColorStop(0, '#FF7A00');
            gradient.addColorStop(1, '#FF9A40');
            ctx.strokeStyle = gradient;
            ctx.lineWidth = lineWidth;
            ctx.lineCap = 'round';
            ctx.stroke();
          }
        });
    }
  }
});
