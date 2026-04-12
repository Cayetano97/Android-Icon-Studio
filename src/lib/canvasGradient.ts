export function applyCanvasBackground(
  ctx: CanvasRenderingContext2D,
  background: string,
  width: number,
  height: number
) {
  if (background.includes('linear-gradient') || background.includes('radial-gradient')) {
    // Basic regex parser for react-best-gradient-color-picker format
    // Example: linear-gradient(135deg, rgba(61,220,132,1) 0%, rgba(0,188,212,1) 100%)
    const typeMatch = background.match(/^(linear|radial)-gradient/);
    const type = typeMatch ? typeMatch[1] : 'linear';

    const innerMatch = background.match(/-gradient\((.*)\)$/);
    if (!innerMatch) {
      ctx.fillStyle = background;
      return;
    }
    const inner = innerMatch[1];
    
    // Split by comma, but be careful of commas inside rgba()
    // Using a simple workaround since react-best-gradient-color-picker formats well
    const parts = inner.split(/,(?![^\(]*\))/).map(x => x.trim());
    let angleParam = parts[0];
    let angle = 180;
    let stopsList = parts.slice(1);
    
    if (angleParam.includes('deg')) {
      angle = parseFloat(angleParam) || 0;
    } else if (angleParam.includes('to ')) {
       const dir = angleParam.trim();
       if (dir === 'to top') angle = 0;
       else if (dir === 'to right') angle = 90;
       else if (dir === 'to bottom') angle = 180;
       else if (dir === 'to left') angle = 270;
       else if (dir === 'to top right') angle = 45;
       else if (dir === 'to bottom right') angle = 135;
       else if (dir === 'to bottom left') angle = 225;
       else if (dir === 'to top left') angle = 315;
    } else {
      // no angle param, means parts[0] is a stop
      stopsList = parts;
    }

    let grad;
    if (type === 'linear') {
      const angleRad = (angle - 90) * (Math.PI / 180);
      const hw = width / 2;
      const hh = height / 2;
      
      const distance = Math.sqrt(hw*hw + hh*hh);
      const x1 = hw + Math.cos(angleRad) * distance;
      const y1 = hh + Math.sin(angleRad) * distance;
      const x2 = hw - Math.cos(angleRad) * distance;
      const y2 = hh - Math.sin(angleRad) * distance;
      
      grad = ctx.createLinearGradient(x2, y2, x1, y1);
    } else {
      // radial
      const hw = width / 2;
      const hh = height / 2;
      grad = ctx.createRadialGradient(hw, hh, 0, hw, hh, Math.max(hw, hh));
    }

    stopsList.forEach(stop => {
      const parts = stop.split(' ');
      const posStr = parts.pop() || '';
      const pos = parseFloat(posStr) / 100;
      const color = parts.join(' ');
      if (!isNaN(pos)) {
        try { grad.addColorStop(pos, color); } catch (e) {}
      }
    });
    ctx.fillStyle = grad;
  } else {
    ctx.fillStyle = background;
  }
}
