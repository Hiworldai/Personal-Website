export const journeyNavItems = [
  { label: '开始', href: '#experience-title' },
  { label: '旅程', href: '#journey-story' },
  { label: '场景', href: '#journey-scenes' },
  { label: '联系', href: '#guestbook-card' }
];

export const journeyScenes = [
  {
    key: 'morning-train',
    image: '/images/journey-01-morning-train.png'
  },
  {
    key: 'morning-bridge',
    image: '/images/journey-02-morning-bridge.png'
  },
  {
    key: 'noon',
    image: '/images/journey-03-noon.png'
  },
  {
    key: 'afternoon',
    image: '/images/journey-04-afternoon.png'
  },
  {
    key: 'evening',
    image: '/images/journey-05-evening.png'
  }
];

export const journeyPanels = [
  {
    key: 'intro',
    id: 'experience-title',
    kicker: 'Train Journey',
    title: '沿着时间出发',
    body: '从黑夜驶向天光，把滚动变成一段有镜头感的旅程。桥梁、云层、雾气与列车共同推进，让第二页成为一段可以被看见的叙事。'
  },
  {
    key: 'story',
    id: 'journey-story',
    kicker: 'Moving Camera',
    title: '让镜头跟随火车',
    body: '不是简单切换图片，而是让场景随着滚动慢慢展开。列车作为主线，把夜色、白昼与夕阳连成一个完整的视觉旅程。'
  },
  {
    key: 'scenes',
    id: 'journey-scenes',
    kicker: 'Scene System',
    title: '穿过不同的世界',
    body: '不同场景让页面不再单调，但统一的云层、雾气和移动方向，让它们仍然属于同一个故事。'
  },
  {
    key: 'sunset',
    id: 'journey-sunset',
    kicker: 'Warm Light',
    title: '抵达黄昏',
    body: '当天空变成橙红与深紫，旅程也进入情绪最浓的一幕。色温升高，云层变重，视线开始向更远的天空抬升。'
  },
  {
    key: 'outro',
    id: 'journey-outro',
    kicker: 'Next Stop',
    title: '下一站，由你定义',
    body: '把一次浏览变成一段可以被记住的旅程。继续向下，页面会自然衔接到最后的 3D 粒子影集。'
  }
];

export const journeyCards = [
  {
    index: '01',
    title: '视觉叙事',
    description: '用镜头语言组织网页节奏，而不是平铺信息。'
  },
  {
    index: '02',
    title: '场景连接',
    description: '用火车、云层和雾气把不同地点串联起来。'
  },
  {
    index: '03',
    title: '滚动推进',
    description: '通过层级位移、淡入与色温变化形成连续转场。'
  },
  {
    index: '04',
    title: '内容承载',
    description: '每一幕都有清晰的信息任务，而不是只做背景展示。'
  }
];

export const contactLinkItems = [
  {
    label: 'GitHub',
    href: 'https://github.com/Hiworlddai'
  },
  {
    label: '邮箱',
    href: 'mailto:1950279740@qq.com'
  },
  {
    label: '微信',
    value: 'woaipaof（备注来意）',
    href: '/gallery/wechat-qr.png'
  }
];

export const guestbookCopy = {
  title: '留言板',
  description: '如果你想交流网页叙事、前端实现、AI 应用，或者只是想聊聊这段火车旅程的视觉氛围，都可以在这里告诉我。',
  fields: {
    email: '你的邮箱',
    message: '想说的话'
  },
  placeholders: {
    email: 'name@example.com',
    message: '写下你想交流的内容...'
  },
  submit: '发送留言',
  note: '本地可以先预览页面，留言功能需要后端邮箱配置正常后才会真正发送。',
  messageMaxLength: 1200
};
