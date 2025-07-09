import { defaultStructureTemplates } from '../services/structureTemplateGenerator';
import { storage } from '../storage';

async function populateStructureTemplates() {
  try {
    console.log('Populating structure templates with predefined examples...');
    
    // Insert each template into the database
    for (const template of defaultStructureTemplates) {
      console.log(`Creating template: ${template.name}`);
      
      await storage.createStructureTemplate({
        name: template.name,
        description: template.description,
        example: template.example,
        templateType: template.templateType,
        isDefault: template.isDefault,
        userId: null, // Default templates don't belong to a specific user
      });
    }
    
    console.log('Successfully populated structure templates!');
    
    // Verify the templates were created
    const defaultTemplates = await storage.getDefaultStructureTemplates();
    console.log(`Created ${defaultTemplates.length} default templates:`);
    defaultTemplates.forEach(template => {
      console.log(`- ${template.name} (${template.templateType})`);
    });
    
  } catch (error) {
    console.error('Error populating structure templates:', error);
  }
}

// Run the script
populateStructureTemplates().then(() => {
  console.log('Script completed');
  process.exit(0);
}).catch(error => {
  console.error('Script failed:', error);
  process.exit(1);
});