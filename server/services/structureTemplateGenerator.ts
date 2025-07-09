import { createChatCompletion } from './openai';

export interface StructureTemplateData {
  name: string;
  description: string;
  templateType: string;
  example: string;
  isDefault: boolean;
}

// Generate AI examples for each structure template
export async function generateStructureTemplateExample(description: string, templateType: string): Promise<string> {
  const prompt = `Generate a realistic example output for a ${templateType} structure following this description: ${description}. 

Make it about 100-150 words and use professional, natural language. Include proper formatting that would be typical for this type of content.`;

  try {
    const response = await createChatCompletion({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        {
          role: "system",
          content: "You are a professional writer creating realistic examples of different writing structures. Your examples should be well-formatted and representative of the requested style."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
      maxTokens: 300
    });

    return response;
  } catch (error) {
    console.error('Error generating structure template example:', error);
    return 'Example content will be generated when this template is used.';
  }
}

// Default structure templates data with predefined examples
export const defaultStructureTemplates: StructureTemplateData[] = [
  {
    name: "Saved Structures",
    description: "Previously saved custom structures created by the user. These are personalized templates that can be reused for consistent formatting across different communications.",
    templateType: "saved",
    example: "Your saved custom structures will appear here. Create and save your own templates for consistent formatting across your communications.",
    isDefault: true
  },
  {
    name: "Custom Structure",
    description: "A flexible template that allows users to define their own custom structure and formatting preferences. Perfect for unique communication needs that don't fit standard templates.",
    templateType: "custom",
    example: "<p><strong>Main Topic</strong> 🎯</p>\n\n<p>Introductory paragraph that sets the context and engages the reader.</p>\n\n<p><strong>Key Points:</strong></p>\n<ul>\n  <li>First important point with supporting details</li>\n  <li>Second key insight with examples</li>\n  <li>Third critical element with actionable information</li>\n</ul>\n\n<p><strong>Conclusion</strong></p>\n\n<p>Summary that reinforces the main message and provides clear next steps or takeaways for the reader. ✨</p>",
    isDefault: true
  },
  {
    name: "Email",
    description: "Professional email structure with clear subject line, greeting, body paragraphs with main points, and appropriate closing. Optimized for business communication with concise, actionable content.",
    templateType: "email",
    example: "<p><strong>Subject:</strong> Quarterly Review Meeting - Action Items Required 📋</p>\n\n<p>Hi Sarah,</p>\n\n<p>I hope this email finds you well. I wanted to follow up on yesterday's quarterly review meeting and share the key action items we discussed.</p>\n\n<p><strong>Immediate Actions:</strong></p>\n<ul>\n  <li>Complete budget analysis by Friday, March 15th 📊</li>\n  <li>Schedule team meetings for project timeline review 📅</li>\n  <li>Submit final recommendations to leadership by March 20th 📄</li>\n</ul>\n\n<p>Please let me know if you need any additional resources or have questions about these deliverables.</p>\n\n<p><strong>Best regards,</strong><br>\nMike Johnson<br>\n<em>Project Manager</em></p>",
    isDefault: true
  },
  {
    name: "LinkedIn Post",
    description: "Engaging social media post structure designed for LinkedIn. Includes attention-grabbing opening, valuable insights or personal experience, and call-to-action. Optimized for professional networking and engagement.",
    templateType: "linkedin_post",
    example: "<p>🚀 Just completed an incredible project that taught me the power of collaborative leadership.</p>\n\n<p>Over the past 6 months, our team transformed a struggling department into our company's top performer. Here's what made the difference:</p>\n\n<ul>\n  <li>✓ <strong>Transparent Communication</strong> - Weekly all-hands meetings kept everyone aligned</li>\n  <li>✓ <strong>Individual Growth Plans</strong> - Each team member had personalized development goals</li>\n  <li>✓ <strong>Celebrating Small Wins</strong> - Monthly recognition boosted morale significantly</li>\n</ul>\n\n<p>The result? <strong>40% increase in productivity</strong> and <strong>95% team satisfaction score</strong>. 📈</p>\n\n<p>💡 What leadership strategies have worked best for your team? Share your experiences below!</p>\n\n<p><em>#Leadership #TeamManagement #ProfessionalGrowth</em></p>",
    isDefault: true
  },
  {
    name: "LinkedIn Article",
    description: "Long-form LinkedIn article structure with compelling headline, introduction hook, body sections with subheadings, key takeaways, and conclusion. Professional tone with storytelling elements.",
    templateType: "linkedin_article",
    example: "# The Remote Work Revolution: 5 Strategies That Actually Work\n\n*After managing distributed teams for 3 years, I've learned what separates successful remote organizations from the rest.*\n\n## The Challenge\n\nWhen our company went fully remote in 2021, productivity dropped 30% in the first quarter. Traditional management approaches weren't working. Here's how we turned things around.\n\n## Strategy 1: Async-First Communication\n\nWe implemented structured async communication protocols that reduced meeting time by 60% while improving decision-making speed.\n\n## Strategy 2: Digital Body Language\n\nTeaching teams to read and use digital body language improved collaboration and reduced misunderstandings significantly.\n\n## Key Takeaways\n\n- Remote work requires intentional culture building\n- Technology enables productivity, but systems drive results\n- Regular check-ins prevent isolation and maintain engagement\n\n## Conclusion\n\nThe future of work is hybrid, and companies that master remote collaboration will have a competitive advantage. What strategies has your organization implemented for remote success?",
    isDefault: true
  },
  {
    name: "Resume",
    description: "Professional resume structure with clear sections: header with contact info, professional summary, work experience with bullet points, skills section, and education. ATS-friendly formatting.",
    templateType: "resume",
    example: "**SARAH CHEN**\nSenior Software Engineer\nPhone: (555) 123-4567 | Email: sarah.chen@email.com | LinkedIn: linkedin.com/in/sarahchen\n\n**PROFESSIONAL SUMMARY**\nExperienced software engineer with 8+ years developing scalable web applications and leading technical teams. Proven track record in full-stack development, cloud architecture, and agile methodologies.\n\n**EXPERIENCE**\n\n**Senior Software Engineer | TechCorp Inc. | 2020 - Present**\n• Led development of microservices architecture serving 10M+ users\n• Reduced application load times by 40% through optimization initiatives\n• Mentored 5 junior developers and conducted technical interviews\n\n**Software Engineer | StartupXYZ | 2018 - 2020**\n• Built responsive web applications using React and Node.js\n• Implemented CI/CD pipelines reducing deployment time by 60%\n• Collaborated with product teams to deliver features on schedule\n\n**TECHNICAL SKILLS**\nLanguages: JavaScript, Python, Java, TypeScript\nFrameworks: React, Node.js, Django, Spring Boot\nCloud: AWS, Docker, Kubernetes\n\n**EDUCATION**\nB.S. Computer Science | University of California, Berkeley | 2016",
    isDefault: true
  },
  {
    name: "Personal Bio",
    description: "Compelling personal biography structure that highlights achievements, expertise, and personality. Includes professional background, key accomplishments, and personal touch. Suitable for websites, speaking engagements, or networking.",
    templateType: "personal_bio",
    example: "Dr. Amanda Rodriguez is a recognized leader in sustainable technology and environmental innovation. As Chief Technology Officer at GreenTech Solutions, she has spearheaded the development of award-winning renewable energy systems that have reduced carbon emissions by over 2 million tons annually.\n\nWith 12 years of experience in clean technology development, Amanda holds 15 patents in solar energy optimization and has published extensively in peer-reviewed journals. She earned her Ph.D. in Environmental Engineering from MIT and her M.S. in Renewable Energy Systems from Stanford University.\n\nAmanda is a frequent keynote speaker at international sustainability conferences and serves on the advisory board of the Clean Energy Foundation. When she's not revolutionizing renewable technology, she enjoys hiking with her rescue dog Max and teaching environmental science to local middle school students.\n\nConnect with Amanda at amanda.rodriguez@greentech.com or follow her sustainability insights on LinkedIn.",
    isDefault: true
  },
  {
    name: "Outreach Message",
    description: "Effective outreach message structure for networking, sales, or collaboration. Includes personalized opening, clear value proposition, specific request or offer, and easy next steps. Designed for high response rates.",
    templateType: "outreach_message",
    example: "Hi Jennifer,\n\nI noticed your recent article on customer retention strategies in retail—your insights on personalization really resonated with my experience at TechCommerce.\n\nI'm reaching out because I'm launching a new analytics platform that helps e-commerce businesses increase customer lifetime value by 25% through predictive modeling. Given your expertise in retail customer experience, I'd love to get your thoughts on the approach.\n\nWould you be open to a brief 15-minute call next week? I can share some early results from our pilot program and get your perspective on the market opportunity.\n\nI'm available Tuesday or Thursday afternoon, or happy to work around your schedule.\n\nBest regards,\nMark Thompson\nFounder, DataInsights Pro\nmark@datainsights.com",
    isDefault: true
  }
];

// Generate all structure templates with AI examples
export async function generateAllStructureTemplates(): Promise<StructureTemplateData[]> {
  const templates: StructureTemplateData[] = [];
  
  for (const template of defaultStructureTemplates) {
    console.log(`Generating example for ${template.name}...`);
    
    let example: string;
    if (template.templateType === 'saved') {
      example = "Your saved custom structures will appear here. Create and save your own templates for consistent formatting across your communications.";
    } else {
      example = await generateStructureTemplateExample(template.description, template.templateType);
    }
    
    templates.push({
      ...template,
      example
    });
  }
  
  return templates;
}