<template>
  <div>
    <!-- 站名横幅（原首页 hero 内容迁移至此：名字 / 副标题 / 两个入口按钮） -->
    <div class="site-hero">
      <h1 class="hero-name">奇迹师 笔记站</h1>
      <p class="hero-text">记录学习，沉淀成长</p>
      <div class="hero-actions">
        <a class="hero-btn brand" href="/#learning">开始阅读</a>
        <a class="hero-btn alt" href="/#planning">人生规划</a>
      </div>
    </div>

    <h2 class="section-title">关于我</h2>
    <div class="intro-text">
      <p>我是奇迹师，一位行走在知识与神秘之间的记录者。作为愚者的信徒，相信奇迹并非遥不可及——它藏在每一次从不懂到懂的顿悟里，藏在每一页翻开又合上的笔记中。</p>
      <p>我的占卜家途径，是沿着 Java 与微服务的骨架、机器学习的算符、深度学习的神经网络一路占卜前进的方向。这里记录了我从凡俗到非凡的学习轨迹，愿每一次阅读，都是一次神秘的聚合。</p>
    </div>
  </div>
</template>

<style scoped>
/* ===== 站名横幅（原 hero 内容样式） ===== */
.site-hero {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 32px;
}

.hero-name {
  font-size: 44px;
  line-height: 52px;
  font-weight: 800;
  margin: 0;
  color: var(--vp-c-brand-1);
  letter-spacing: 2px;
}

.hero-text {
  font-size: 20px;
  line-height: 28px;
  margin: 0;
  color: var(--vp-c-text-2);
}

.hero-actions {
  display: flex;
  gap: 12px;
  margin-top: 8px;
}

.hero-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 10px 20px;
  font-size: 14px;
  font-weight: 600;
  border-radius: 6px;
  text-decoration: none;
  transition: all 0.2s ease;
}

.hero-btn.brand {
  border: 1px solid #2563eb;
  background: #2563eb;
  color: #fff;
  box-shadow: 0 0 18px rgba(37, 99, 235, 0.35);
}

.hero-btn.brand:hover {
  border-color: #fff;
  background: #1d4ed8;
  transform: translateY(-2px);
}

.hero-btn.alt {
  border: 1px solid #151d2e;
  background: #151d2e;
  color: #fff;
}

.hero-btn.alt:hover {
  border-color: #fff;
  background: #0e1526;
  transform: translateY(-2px);
}

/* ===== 关于我 ===== */
.section-title {
  font-size: 24px;
  line-height: 32px;
  font-weight: 600;
  text-align: left;
  margin: 0 0 20px;
}

.intro-text p {
  margin: 0 0 12px;
  font-size: 15px;
  line-height: 1.8;
  color: var(--vp-c-text-1);
}

.intro-text p:last-child {
  margin-bottom: 0;
}
</style>
