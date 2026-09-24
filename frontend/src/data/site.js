// Single source for the copy that appears in more than one place.

export const profile = {
  name: 'Brendan Chharawala',
  role: 'Robotics and autonomy engineer',
  email: 'brendancmechatronics@gmail.com',
  linkedin: 'https://www.linkedin.com/in/bchharawala/',
  github: 'https://github.com/bchharaw',
  // Drop a PDF at public/assets/resume.pdf and set this to 'assets/resume.pdf'
  // to show the Resume buttons.
  resume: null,
  current: { title: 'Autonomous vehicles developer', org: 'GoodLabs Studio' },
  range: 'ML · RL · perception · embedded · simulation',
};

export const problemMailto = `mailto:${profile.email}?subject=${encodeURIComponent('A hard problem for you')}`;

// One stop per milestone on the hero drive, in chronological order. `node` is
// the intersection (i, j) in the city grid where that milestone's landmark stands.
export const milestones = [
  {
    when: '1A', where: 'University of Waterloo', node: [1, 0],
    what: 'Mechatronics Engineering, AI specialization',
    detail: 'First build: a 2-axis gantry that types on a real keyboard to send texts (MTE 100).',
    href: '#projects',
  },
  {
    when: 'May 2023', where: 'GoodLabs Studio', node: [3, 1],
    what: 'Robbie, a 3 ft humanoid',
    detail: 'Designed and built an 18-DoF humanoid from scratch on a team of three.',
    href: '#robbie',
  },
  {
    when: 'Jan 2024', where: 'GoodLabs Studio', node: [4, 3],
    what: 'RL, from Isaac Gym to hardware',
    detail: 'PPO over 4096 parallel humanoids, then a policy walking on the robot at under 20 ms per step.',
    href: '#rl',
  },
  {
    when: 'Oct 2024', where: 'VIP Lab, UWaterloo', node: [2, 3],
    what: 'Matryoshka representations',
    detail: 'Matryoshka-style mixture of experts with linear routing, built on BERT.',
    href: '#experience',
  },
  {
    when: 'May 2025', where: 'National Research Council', node: [0, 2],
    what: 'Imitation learning on a UR10e',
    detail: 'Failure analysis of OpenVLA, Octo and ACT; first-author CoRL workshop paper.',
    href: '#research',
  },
  {
    when: 'Dec 2025', where: 'SIGGRAPH Asia 2025', node: [1, 4],
    what: 'SHARE published',
    detail: 'Human-scene reconstruction from monocular video, with Xue Bin Peng and NRC.',
    href: '#research',
  },
  {
    when: 'Jan 2026', where: 'ENVGO', node: [3, 4],
    what: 'ML data and cloud infrastructure',
    detail: 'Automated dataset generation: 24× faster and 32× cheaper data preparation.',
    href: '#experience',
  },
  {
    when: 'May 2026', where: 'ENVGO', node: [4, 1],
    what: 'Radar perception',
    detail: 'Radar signal processing and firmware for an 8T6R MIMO radar.',
    href: '#experience',
  },
  {
    when: 'Now', where: 'GoodLabs Studio', node: [1, 3],
    what: 'Autonomous vehicles developer',
    detail: 'Building autonomous vehicle software.',
    href: '#experience',
  },
];
