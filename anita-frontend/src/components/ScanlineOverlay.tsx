/**
 * 视觉扫描线滤镜 — 全屏 fixed 覆盖层，模拟 CRT 显示器效果
 * 纯展示组件，无 props
 * 两层渐变叠加：
 *   第一层：水平扫描线（100%宽 x 4px高，上半透明 + 下半暗色，repeat 形成横纹）
 *   第二层：RGB 子像素条纹（3px宽 x 100%高，红-绿-蓝交替，模拟真实屏幕像素）
 * crt-flicker：95%↔85% 透明度快速闪烁，营造不安氛围
 */
export default function ScanlineOverlay() {
  return (
    <div className="pointer-events-none fixed inset-0 z-50
      bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),
          linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))]
      bg-size-[100%_4px,3px_100%]
      opacity-20 crt-flicker"
    />
  );
}
