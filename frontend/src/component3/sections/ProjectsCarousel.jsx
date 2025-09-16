import React, { useState, useEffect, useRef } from 'react';
import InteractiveChart from '../InteractiveChart';
import './ProjectsCarousel.css';

const ProjectsCarousel = () => {
  const [activeProject, setActiveProject] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const sectionRef = useRef(null);

  const projects = [
    {
      id: 1,
      title: "Autonomous Navigation System",
      category: "Academic Project",
      course: "ECE 457A - Cooperative and Adaptive Algorithms",
      description: "Developed a multi-agent pathfinding system using A* and RRT algorithms for autonomous robots in complex environments.",
      image: "https://images.unsplash.com/photo-1518611012118-696072aa579a?w=600&h=400&fit=crop",
      video: "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=600&h=400&fit=crop",
      tech: ["Python", "ROS", "OpenCV", "NumPy"],
      metrics: {
        accuracy: "94%",
        speed: "Real-time",
        environments: "12"
      },
      grade: "A+",
      duration: "4 months",
      github: "https://github.com/bchharaw/autonomous-nav",
      demo: "https://demo-link.com"
    },
    {
      id: 2,
      title: "Smart Manufacturing Optimizer",
      category: "Internship Project",
      company: "GoodLabs Studio",
      description: "Machine learning system for optimizing manufacturing processes using predictive analytics and IoT sensor data.",
      image: "https://images.unsplash.com/photo-1565514020179-026b92b84bb6?w=600&h=400&fit=crop",
      video: "https://images.unsplash.com/photo-1581092160562-40aa08e78837?w=600&h=400&fit=crop",
      tech: ["TensorFlow", "IoT", "Docker", "AWS"],
      metrics: {
        efficiency: "+23%",
        savings: "$50K",
        uptime: "99.2%"
      },
      duration: "6 months",
      impact: "Production efficiency increased by 23%",
      github: "https://github.com/bchharaw/smart-manufacturing"
    },
    {
      id: 3,
      title: "Neural Network Accelerator",
      category: "Capstone Project",
      course: "ECE 499 - Design Project",
      description: "FPGA-based hardware accelerator for convolutional neural networks with custom memory hierarchy and parallel processing.",
      image: "https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=600&h=400&fit=crop",
      video: "https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=600&h=400&fit=crop",
      tech: ["Verilog", "FPGA", "CUDA", "C++"],
      metrics: {
        speedup: "15x",
        power: "60% less",
        accuracy: "99.1%"
      },
      grade: "A+",
      duration: "8 months",
      award: "Best Capstone Project 2024",
      github: "https://github.com/bchharaw/nn-accelerator"
    },
    {
      id: 4,
      title: "Robotic Vision System",
      category: "Research Project",
      lab: "Vision & Image Processing Group",
      description: "Computer vision system for real-time object detection and manipulation using deep learning and stereo vision.",
      image: "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=600&h=400&fit=crop",
      video: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=600&h=400&fit=crop",
      tech: ["PyTorch", "OpenCV", "ROS", "PCL"],
      metrics: {
        detection: "98.5%",
        latency: "12ms",
        objects: "50+"
      },
      duration: "10 months",
      publication: "ICRA 2025 (Under Review)",
      github: "https://github.com/bchharaw/robotic-vision"
    },
    {
      id: 5,
      title: "Distributed Computing Framework",
      category: "Personal Project",
      type: "Open Source",
      description: "High-performance distributed computing framework for machine learning workloads with fault tolerance and auto-scaling.",
      image: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=600&h=400&fit=crop",
      video: "https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=600&h=400&fit=crop",
      tech: ["Go", "Kubernetes", "gRPC", "Redis"],
      metrics: {
        throughput: "10K ops/s",
        scalability: "1000 nodes",
        uptime: "99.9%"
      },
      duration: "1 year",
      stars: "1.2K GitHub stars",
      downloads: "50K+ downloads",
      github: "https://github.com/bchharaw/distributed-ml"
    },
    {
      id: 6,
      title: "Medical Image Analysis Tool",
      category: "Hackathon Project",
      event: "MedHacks 2024",
      description: "AI-powered medical imaging tool for early detection of anomalies using deep learning and segmentation techniques.",
      image: "https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=600&h=400&fit=crop",
      video: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1f?w=600&h=400&fit=crop",
      tech: ["Python", "TensorFlow", "Flask", "React"],
      metrics: {
        accuracy: "96.8%",
        speed: "2.3s",
        sensitivity: "94%"
      },
      duration: "48 hours",
      award: "1st Place Winner",
      prize: "$10,000",
      github: "https://github.com/bchharaw/medical-imaging"
    }
  ];

  useEffect(() => {
    if (isAutoPlaying) {
      const interval = setInterval(() => {
        setActiveProject((prev) => (prev + 1) % projects.length);
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [isAutoPlaying, projects.length]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('animate');
          }
        });
      },
      { threshold: 0.1 }
    );

    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  const currentProject = projects[activeProject];
  const performanceData = [92, 94, 96, 98, 95, 97, 99];

  return (
    <section className="projects-carousel section" ref={sectionRef}>
      <div className="content-container">
        <div className="section-header fade-in">
          <div className="header-badge">
            <span>Featured Projects</span>
          </div>
          <h2 className="section-title">
            A few other things I've done here and there
            <br />
          </h2>
          <p className="section-subtitle">
            Comprehensive showcase of academic coursework, research projects, 
            internship contributions, and personal innovations
          </p>
        </div>

        <div className="carousel-container fade-in delay-1">
          <div className="carousel-header">
            <div className="project-navigation">
              <button 
                className="nav-btn prev"
                onClick={() => setActiveProject((prev) => (prev - 1 + projects.length) % projects.length)}
              >
                ‹
              </button>
              <div className="project-counter">
                <span className="current">{activeProject + 1}</span>
                <span className="separator">/</span>
                <span className="total">{projects.length}</span>
              </div>
              <button 
                className="nav-btn next"
                onClick={() => setActiveProject((prev) => (prev + 1) % projects.length)}
              >
                ›
              </button>
            </div>

            <button 
              className={`autoplay-btn ${isAutoPlaying ? 'active' : ''}`}
              onClick={() => setIsAutoPlaying(!isAutoPlaying)}
            >
              {isAutoPlaying ? '⏸' : '▶'} Auto Play
            </button>
          </div>

          <div className="project-showcase">
            <div className="project-media">
              <div className="media-container">
                <img 
                  src={currentProject.image} 
                  alt={currentProject.title}
                  className="project-image"
                />
                <div className="media-overlay">
                  <button className="play-button">
                    <span className="play-icon">▶</span>
                  </button>
                  <div className="project-badge">
                    {currentProject.category}
                  </div>
                </div>
              </div>

              <div className="project-metrics">
                <div className="metrics-grid">
                  {Object.entries(currentProject.metrics).map(([key, value]) => (
                    <div key={key} className="metric-item">
                      <div className="metric-value">{value}</div>
                      <div className="metric-label">{key}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="project-details">
              <div className="project-header">
                <h3 className="project-title">{currentProject.title}</h3>
                <div className="project-meta">
                  {currentProject.course && (
                    <span className="meta-item">📚 {currentProject.course}</span>
                  )}
                  {currentProject.company && (
                    <span className="meta-item">🏢 {currentProject.company}</span>
                  )}
                  {currentProject.lab && (
                    <span className="meta-item">🔬 {currentProject.lab}</span>
                  )}
                  {currentProject.event && (
                    <span className="meta-item">🏆 {currentProject.event}</span>
                  )}
                  <span className="meta-item">⏱️ {currentProject.duration}</span>
                </div>
              </div>

              <p className="project-description">{currentProject.description}</p>

              <div className="project-achievements">
                {currentProject.grade && (
                  <div className="achievement">
                    <strong>Grade:</strong> {currentProject.grade}
                  </div>
                )}
                {currentProject.award && (
                  <div className="achievement award">
                    🏆 {currentProject.award}
                  </div>
                )}
                {currentProject.impact && (
                  <div className="achievement">
                    <strong>Impact:</strong> {currentProject.impact}
                  </div>
                )}
                {currentProject.publication && (
                  <div className="achievement">
                    <strong>Publication:</strong> {currentProject.publication}
                  </div>
                )}
                {currentProject.stars && (
                  <div className="achievement">
                    ⭐ {currentProject.stars}
                  </div>
                )}
              </div>

              <div className="project-tech">
                <h4>Technologies Used</h4>
                <div className="tech-stack">
                  {currentProject.tech.map((tech, index) => (
                    <span key={index} className="tech-tag">{tech}</span>
                  ))}
                </div>
              </div>

              <div className="project-links">
                {currentProject.github && (
                  <a href={currentProject.github} className="project-link primary">
                    <span className="link-icon">📂</span>
                    View Code
                  </a>
                )}
                {currentProject.demo && (
                  <a href={currentProject.demo} className="project-link secondary">
                    <span className="link-icon">🔗</span>
                    Live Demo
                  </a>
                )}
              </div>
            </div>
          </div>

          <div className="carousel-indicators">
            {projects.map((_, index) => (
              <button
                key={index}
                className={`indicator ${index === activeProject ? 'active' : ''}`}
                onClick={() => setActiveProject(index)}
              />
            ))}
          </div>
        </div>

        <div className="projects-analytics fade-in delay-2">
          <InteractiveChart
            type="line"
            data={performanceData}
            title="Project Performance Metrics"
            subtitle="Success rate and impact measurement across all projects"
            height={250}
          />
        </div>
      </div>
    </section>
  );
};

export default ProjectsCarousel;