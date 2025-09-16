import React from 'react';
import './Footer.css';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  const socialLinks = [
    { 
      name: 'GitHub', 
      url: 'https://github.com/bchharaw', 
      icon: '📂',
      description: '50+ repositories'
    },
    { 
      name: 'LinkedIn', 
      url: 'https://linkedin.com/in/bchharaw', 
      icon: '💼',
      description: 'Professional network'
    }
  ];

  const skills = {
    "Programming Languages": {
      items: [
        { name: "Python", level: 95, years: "4+ years" },
        { name: "C++", level: 88, years: "3+ years" },
        { name: "JavaScript", level: 82, years: "2+ years" },
        { name: "MATLAB", level: 78, years: "3+ years" },
        { name: "Verilog/VHDL", level: 75, years: "2+ years" }
      ]
    },
    "Machine Learning": {
      items: [
        { name: "PyTorch", level: 92, years: "2+ years" },
        { name: "TensorFlow", level: 85, years: "2+ years" },
        { name: "Computer Vision", level: 90, years: "2+ years" },
        { name: "Reinforcement Learning", level: 88, years: "1+ years" },
        { name: "NLP", level: 70, years: "1+ years" }
      ]
    },
    "Robotics": {
      items: [
        { name: "ROS/ROS2", level: 90, years: "2+ years" },
        { name: "NVIDIA Isaac", level: 85, years: "1+ years" },
        { name: "Gazebo", level: 82, years: "2+ years" },
        { name: "MoveIt", level: 78, years: "1+ years" },
        { name: "OpenCV", level: 88, years: "2+ years" }
      ]
    }
  };

  const education = {
    degree: "Bachelor of Applied Science (BASc)",
    major: "Mechatronics Engineering",
    specialization: "Artificial Intelligence Specialization",
    university: "University of Waterloo",
    gpa: "3.7/4.0",
    expectedGraduation: "April 2026",
    relevantCourses: [
      "ECE 457A - Cooperative and Adaptive Algorithms",
      "ECE 457B - Fundamentals of Computational Intelligence", 
      "ECE 486 - Robot Dynamics and Control",
      "ECE 454 - Distributed Computing",
      "ECE 358 - Computer Networks",
      "ECE 499 - Design Project (Capstone)"
    ],
    honors: [
      "Dean's Honour List (Fall 2023, Winter 2024)",
      "President's Scholarship of Distinction",
      "Engineering Excellence Scholarship"
    ]
  };

  const certifications = [
    {
      name: "AWS Certified Machine Learning - Specialty",
      issuer: "Amazon Web Services",
      date: "2024",
      credential: "AWS-MLS-2024-001234"
    },
    {
      name: "Deep Learning Specialization",
      issuer: "DeepLearning.AI (Coursera)",
      date: "2023",
      credential: "COURSERA-DL-2023"
    },
    {
      name: "ROS for Beginners: Robotics with ROS",
      issuer: "The Construct",
      date: "2023",
      credential: "ROS-CONSTRUCT-2023"
    }
  ];

  const extracurriculars = [
    {
      organization: "UWaterloo Robotics Team",
      role: "Software Lead",
      period: "2023-Present",
      description: "Lead software development for autonomous navigation systems"
    },
    {
      organization: "IEEE Robotics and Automation Society",
      role: "Student Member",
      period: "2022-Present",
      description: "Active participant in workshops and conferences"
    },
    {
      organization: "Hack the North",
      role: "Volunteer & Participant",
      period: "2023-2024",
      description: "Canada's biggest hackathon - multiple participations"
    },
    {
      organization: "UW Data Science Club",
      role: "Workshop Presenter",
      period: "2023-2024",
      description: "Delivered ML workshops to 150+ students"
    }
  ];

  return (
    <footer className="footer">
      <div className="footer-content">
        {/* Main Footer Content */}
        <div className="footer-main">
          <div className="footer-brand">
            <h2 className="brand-name">Brendan Chharawala</h2>
            <p className="brand-tagline">ML Robotics Engineer</p>
            <p className="brand-description">
              Passionate about bridging the gap between simulation and reality 
              through advanced machine learning and robotics research.
            </p>
            
            <div className="contact-primary">
              <a href="mailto:bchharaw@uwaterloo.ca" className="contact-email">
                📧 bchharaw@uwaterloo.ca
              </a>
              <a href="tel:+1234567890" className="contact-phone">
                📱 +1 (234) 567-8900
              </a>
              <div className="contact-location">
                📍 Waterloo, ON, Canada
              </div>
            </div>
          </div>

          <div className="footer-section">
            <h3>Education</h3>
            <div className="education-info">
              <div className="degree-info">
                <strong>{education.degree}</strong>
                <div className="major">{education.major}</div>
                <div className="specialization">{education.specialization}</div>
                <div className="university">{education.university}</div>
                <div className="gpa">GPA: {education.gpa} • Expected: {education.expectedGraduation}</div>
              </div>
              
              <div className="honors">
                <h4>Honors & Awards</h4>
                <ul>
                  {education.honors.map((honor, index) => (
                    <li key={index}>{honor}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          <div className="footer-section">
            <h3>Skills Matrix</h3>
            <div className="skills-matrix">
              {Object.entries(skills).map(([category, data]) => (
                <div key={category} className="skill-category">
                  <h4>{category}</h4>
                  <div className="skills-list">
                    {data.items.slice(0, 3).map((skill, index) => (
                      <div key={index} className="skill-item">
                        <div className="skill-header">
                          <span className="skill-name">{skill.name}</span>
                          <span className="skill-years">{skill.years}</span>
                        </div>
                        <div className="skill-bar">
                          <div 
                            className="skill-progress" 
                            style={{ width: `${skill.level}%` }}
                          ></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="footer-section">
            <h3>Connect</h3>
            <div className="social-links">
              {socialLinks.map((link, index) => (
                <a 
                  key={index}
                  href={link.url} 
                  className="social-link"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <span className="social-icon">{link.icon}</span>
                  <div className="social-info">
                    <span className="social-name">{link.name}</span>
                    <span className="social-description">{link.description}</span>
                  </div>
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Extended Footer Sections */}
        <div className="footer-extended">
          <div className="extended-section">
            <h3>Certifications</h3>
            <div className="certifications-list">
              {certifications.map((cert, index) => (
                <div key={index} className="certification-item">
                  <div className="cert-name">{cert.name}</div>
                  <div className="cert-issuer">{cert.issuer} • {cert.date}</div>
                  <div className="cert-credential">ID: {cert.credential}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="extended-section">
            <h3>Extracurricular Activities</h3>
            <div className="activities-list">
              {extracurriculars.map((activity, index) => (
                <div key={index} className="activity-item">
                  <div className="activity-header">
                    <strong>{activity.organization}</strong>
                    <span className="activity-period">{activity.period}</span>
                  </div>
                  <div className="activity-role">{activity.role}</div>
                  <div className="activity-description">{activity.description}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="extended-section">
            <h3>Quick Actions</h3>
            <div className="quick-actions">
              <a href="/resume.pdf" className="action-button primary" target="_blank">
                📄 Download Resume
              </a>
              <a href="/transcript.pdf" className="action-button secondary" target="_blank">
                📊 View Transcript
              </a>
              <a href="mailto:bchharaw@uwaterloo.ca?subject=Collaboration Opportunity" className="action-button secondary">
                🤝 Collaboration
              </a>
              <a href="https://calendly.com/bchharaw/30min" className="action-button secondary" target="_blank">
                📅 Schedule Meeting
              </a>
            </div>
          </div>
        </div>

        {/* Footer Bottom */}
        <div className="footer-bottom">
          <div className="footer-info">
            <div className="copyright">
              © {currentYear} Brendan Chharawala. All rights reserved.
            </div>
            <div className="build-info">
              Built with React, and many late hours in UWaterloo Engineering 7
            </div>
          </div>
          
          <div className="footer-meta">
            <div className="availability-status">
              <div className="status-indicator available"></div>
              <span>Available for co-ops Jan-Aug 2026, and full time May 2027</span>
            </div>
            <div className="location-info">
              🌍 Open to relocation • 🛂 Work authorization: Canada, EU, (US via H1B)
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;