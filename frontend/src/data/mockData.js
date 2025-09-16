// Mock data for the robotics portfolio
export const portfolioData = {
  personal: {
    name: "Brendan Chharawala",
    title: "ML Robotics Engineer",
    email: "bchharaw@uwaterloo.ca",
    university: "University of Waterloo",
    degree: "BASc - Mechatronics Engineering, AI Specialization",
    gpa: "3.7"
  },
  
  experience: [
    {
      id: 1,
      title: "ML Robotics Engineering Intern",
      company: "National Research Council of Canada",
      location: "Ottawa, ON",
      period: "May. 2025 – Aug. 2025",
      achievements: [
        "Research Submissions: 'Design Decisions that Matter in Imitation Learning'; CoRL 2025 Data in Robotics Workshop, 1st auth., Accepted.",
        "'SHARE: Scene-Human Aligned Reconstruction'; SIGGRAPH Asia 2025 Technical Com., 2nd auth., Under review.",
        "'Teleoperation for Scalable Learning'; HUMANOIDS 2025 ARC Workshop, 3rd auth., Accepted.",
        "Automated Trajectory Generation: Designed a Bézier-based random natural trajectory generator for a 6-DoF manipulator with 2.5 mm path error",
        "Robotic Policy Training on UR10e Arm: Diagnosed failure modes, outlier robustness, and augmentation sensitivities for OpenVLA, Octo, and ACT policies"
      ]
    },
    {
      id: 2,
      title: "Machine Learning and Robotics Developer",
      company: "GoodLabs Studio",
      location: "Toronto, ON",
      period: "May 2023 – Jan. 2025",
      achievements: [
        "Making a Humanoid Robot Walk in Real Life using RL: Implemented a PPO-based Actor-Critic policy in PyTorch",
        "Achieved walking on a real-life robot at variable speeds (0.1–0.6 m/s) with resistance to pushing",
        "Designing a 3 ft-tall Humanoid Robot: Designed the legs and torso with 3D-printed components",
        "Human Pose Embeddings: Wrote a VAE-LSTM pipeline in TensorFlow to process human walking videos into 3D latents"
      ]
    },
    {
      id: 3,
      title: "Machine Learning Researcher",
      company: "The Vision Image Processing Group",
      location: "Waterloo, ON",
      period: "Oct. 2024 – Apr. 2025",
      achievements: [
        "Implemented results from the 'Matryoshka Representation Learning' paper",
        "Built efficient scalable adaptation using BERT for emotion classification",
        "Developed a Matryoshka-Style Mixture of Experts framework with linear routing"
      ]
    }
  ],
  
  projects: [
    {
      id: 1,
      title: "Humanoid Robot Locomotion",
      description: "PPO-based walking system achieving 0.1-0.6 m/s speeds",
      technologies: ["PyTorch", "NVIDIA Isaac Gym", "Reinforcement Learning"],
      category: "robotics"
    },
    {
      id: 2,
      title: "Human Pose VAE-LSTM",
      description: "3D pose embedding system with 98% validation accuracy",
      technologies: ["TensorFlow", "VAE", "LSTM", "Computer Vision"],
      category: "ml"
    },
    {
      id: 3,
      title: "6-DoF Trajectory Generation",
      description: "Bézier-based trajectory generator with 2.5mm accuracy",
      technologies: ["Python", "Robotics", "Path Planning"],
      category: "robotics"
    },
    {
      id: 4,
      title: "Matryoshka Representation Learning",
      description: "Scalable BERT adaptation for emotion classification",
      technologies: ["BERT", "NLP", "Deep Learning"],
      category: "research"
    }
  ],
  
  publications: [
    {
      title: "Design Decisions that Matter in Imitation Learning",
      venue: "CoRL 2025 Data in Robotics Workshop",
      status: "Accepted",
      authorship: "1st author"
    },
    {
      title: "SHARE: Scene-Human Aligned Reconstruction",
      venue: "SIGGRAPH Asia 2025 Technical Committee",
      status: "Under review",
      authorship: "2nd author"
    },
    {
      title: "Teleoperation for Scalable Learning",
      venue: "HUMANOIDS 2025 ARC Workshop",
      status: "Accepted",
      authorship: "3rd author"
    }
  ],
  
  skills: {
    programming: ["Python", "C++", "JavaScript", "MATLAB"],
    frameworks: ["PyTorch", "TensorFlow", "ROS", "OpenCV"],
    robotics: ["NVIDIA Isaac Gym", "Gazebo", "MoveIt", "Rviz"],
    ml: ["Reinforcement Learning", "Computer Vision", "NLP", "Deep Learning"],
    tools: ["Git", "Docker", "Linux", "3D Printing"]
  }
};

// Placeholder video/media URLs (these would be replaced with actual assets)
export const mediaAssets = {
  videos: {
    robotWalking: "/videos/robot-walking-demo.mp4",
    isaacGym: "/videos/isaac-gym-simulation.mp4",
    humanPose: "/videos/human-pose-analysis.mp4",
    trajectoryGeneration: "/videos/trajectory-demo.mp4"
  },
  images: {
    robotDesign: "/images/humanoid-robot-design.jpg",
    labSetup: "/images/robotics-lab-setup.jpg",
    researchPoster: "/images/research-presentation.jpg",
    teamPhoto: "/images/research-team.jpg"
  }
};