import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, X, Upload, FileText, AlertCircle, BookOpen, Save } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { insertVoiceProfileSchema } from "@shared/schema";
import type { VoiceProfile, StructureTemplate } from "@shared/schema";
import { z } from "zod";

interface DetailedVoiceProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile?: VoiceProfile | null;
}

const toneOptions = [
  "Witty", "Serious", "Playful", "Professional", "Casual",
  "Authoritative", "Friendly", "Formal", "Conversational", "Enthusiastic",
  "Analytical", "Creative", "Empathetic", "Direct", "Diplomatic"
];

const formattingLabels = {
  boldUsage: ["None", "Minimal", "Moderate", "Frequent", "Heavy", "Maximum"],
  lineSpacing: ["Dense", "Compact", "Normal", "Comfortable", "Spacious", "Very Spacious"],
  emojiUsage: ["Never", "Very Rare", "Sparingly", "Occasionally", "Frequently", "Expressively"],
  listVsParagraphs: ["All Paragraphs", "Mostly Paragraphs", "Balanced", "Prefer Lists", "Mostly Lists", "All Lists"],
  markupStyle: ["Plain Text", "Light Formatting", "Markdown", "Rich Markdown", "HTML Elements", "Full HTML"]
};

const formSchema = insertVoiceProfileSchema.omit({
  userId: true,
}).extend({
  name: z.string().min(1, "Name is required"),
});

export default function DetailedVoiceProfileModal({ isOpen, onClose, profile }: DetailedVoiceProfileModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [customTone, setCustomTone] = useState("");
  const [customEthicalBoundary, setCustomEthicalBoundary] = useState("");
  const [selectedStructureTemplate, setSelectedStructureTemplate] = useState<StructureTemplate | null>(null);
  const [customStructureName, setCustomStructureName] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState<Array<{
    name: string;
    content: string;
    type: string;
    size: number;
  }>>([]);

  // Fetch structure templates
  const { data: structureTemplates, isLoading: templatesLoading } = useQuery({
    queryKey: ["/api/structure-templates"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/structure-templates");
      return response.json() as Promise<{
        default: StructureTemplate[];
        user: StructureTemplate[];
      }>;
    },
  });

  // Initialize selected template when editing existing profile
  useEffect(() => {
    if (profile && structureTemplates && !selectedStructureTemplate) {
      const description = profile.description || "";
      const structureMatch = description.match(/Structure: (.+)/);
      if (structureMatch) {
        const structureName = structureMatch[1];
        const allTemplates = [...(structureTemplates.default || []), ...(structureTemplates.user || [])];
        const matchingTemplate = allTemplates.find(t => t.name === structureName);
        if (matchingTemplate) {
          setSelectedStructureTemplate(matchingTemplate);
        }
      }
    }
  }, [profile, structureTemplates, selectedStructureTemplate]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: profile?.name || "",
      description: profile?.description || "",
      purpose: profile?.purpose || "",
      structurePreferences: profile?.structurePreferences || "",
      moralTone: profile?.moralTone || "",
      toneOptions: profile?.toneOptions || [],
      customTones: profile?.customTones || [],
      ethicalBoundaries: profile?.ethicalBoundaries || [],
      boldUsage: profile?.boldUsage || 2,
      lineSpacing: profile?.lineSpacing || 2,
      emojiUsage: profile?.emojiUsage || 1,
      listVsParagraphs: profile?.listVsParagraphs || 2,
      markupStyle: profile?.markupStyle || 2,
      preferredStance: profile?.preferredStance || "",
      humourLevel: profile?.humourLevel || "",
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: z.infer<typeof formSchema>) => {
      const url = profile ? `/api/voice-profiles/${profile.id}` : "/api/voice-profiles";
      const method = profile ? "PATCH" : "POST";
      const response = await apiRequest(method, url, data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: `Voice profile ${profile ? "updated" : "created"} successfully`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/voice-profiles"] });
      onClose();
      form.reset();
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      
      toast({
        title: "Error",
        description: `Failed to ${profile ? "update" : "create"} voice profile`,
        variant: "destructive",
      });
    },
  });

  const addCustomTone = () => {
    if (customTone.trim()) {
      const currentCustomTones = form.getValues("customTones") || [];
      form.setValue("customTones", [...currentCustomTones, customTone.trim()]);
      setCustomTone("");
    }
  };

  const removeCustomTone = (index: number) => {
    const currentCustomTones = form.getValues("customTones") || [];
    form.setValue("customTones", currentCustomTones.filter((_, i) => i !== index));
  };

  const addEthicalBoundary = () => {
    if (customEthicalBoundary.trim()) {
      const currentBoundaries = form.getValues("ethicalBoundaries") || [];
      form.setValue("ethicalBoundaries", [...currentBoundaries, customEthicalBoundary.trim()]);
      setCustomEthicalBoundary("");
    }
  };

  const removeEthicalBoundary = (index: number) => {
    const currentBoundaries = form.getValues("ethicalBoundaries") || [];
    form.setValue("ethicalBoundaries", currentBoundaries.filter((_, i) => i !== index));
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    
    if (uploadedFiles.length + files.length > 3) {
      toast({
        title: "Upload Limit",
        description: "You can only upload up to 3 example texts",
        variant: "destructive",
      });
      return;
    }

    for (const file of files) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast({
          title: "File Too Large",
          description: `${file.name} is too large. Maximum size is 5MB.`,
          variant: "destructive",
        });
        continue;
      }

      try {
        let content = "";
        
        if (file.type.startsWith("text/") || file.type === "application/pdf" || 
            file.type === "application/msword" || 
            file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
          
          if (file.type === "application/pdf") {
            // For PDF files, we'll need to handle them on the backend
            content = `[PDF File: ${file.name} - Will be processed on server]`;
          } else if (file.type.includes("word") || file.type.includes("document")) {
            // For Word docs, we'll need to handle them on the backend
            content = `[Document File: ${file.name} - Will be processed on server]`;
          } else {
            // Plain text files
            content = await file.text();
          }
          
          setUploadedFiles(prev => [...prev, {
            name: file.name,
            content,
            type: file.type,
            size: file.size,
          }]);
        } else {
          toast({
            title: "Unsupported File Type",
            description: `${file.name} is not a supported file type. Please upload text, PDF, or Word documents.`,
            variant: "destructive",
          });
        }
      } catch (error) {
        toast({
          title: "Upload Error",
          description: `Failed to read ${file.name}`,
          variant: "destructive",
        });
      }
    }
    
    // Clear the input
    event.target.value = "";
  };

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleStructureTemplateSelect = (template: StructureTemplate) => {
    setSelectedStructureTemplate(template);
    
    // Update the description field with the selected template name
    const currentDescription = form.getValues("description") || "";
    const structurePrefix = "Structure: ";
    
    // Remove existing structure info from description
    const descriptionWithoutStructure = currentDescription
      .split('\n')
      .filter(line => !line.startsWith(structurePrefix))
      .join('\n')
      .trim();
    
    // Add new structure template name to description
    const newDescription = descriptionWithoutStructure 
      ? `${descriptionWithoutStructure}\n${structurePrefix}${template.name}`
      : `${structurePrefix}${template.name}`;
    
    form.setValue("description", newDescription);
    
    if (template.templateType === "custom") {
      // For custom template, let user modify the structure preferences
      form.setValue("structurePreferences", template.example);
    } else {
      // For predefined templates, use the example as the structure preference
      form.setValue("structurePreferences", `${template.description}\n\nExample format:\n${template.example}`);
    }
  };

  const saveCustomStructure = async () => {
    if (!customStructureName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a name for your custom structure",
        variant: "destructive",
      });
      return;
    }

    try {
      const structureContent = form.getValues("structurePreferences");
      await apiRequest("POST", "/api/structure-templates", {
        name: customStructureName,
        description: `Custom structure: ${customStructureName}`,
        example: structureContent,
        templateType: "custom",
        isDefault: false,
      });

      toast({
        title: "Success",
        description: "Custom structure saved successfully",
      });

      setCustomStructureName("");
      queryClient.invalidateQueries({ queryKey: ["/api/structure-templates"] });
    } catch (error) {
      console.error("Error saving custom structure:", error);
      toast({
        title: "Error",
        description: "Failed to save custom structure",
        variant: "destructive",
      });
    }
  };

  const deleteStructureTemplate = async (templateId: number) => {
    try {
      await apiRequest("DELETE", `/api/structure-templates/${templateId}`);
      
      queryClient.invalidateQueries({ queryKey: ["/api/structure-templates"] });
      
      // Clear selection if deleted template was selected
      if (selectedStructureTemplate?.id === templateId) {
        setSelectedStructureTemplate(null);
      }
      
      toast({
        title: "Success",
        description: "Structure template deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting structure template:", error);
      toast({
        title: "Error",
        description: "Failed to delete structure template",
        variant: "destructive",
      });
    }
  };

  const onSubmit = (data: z.infer<typeof formSchema>) => {
    console.log("Form submitted with data:", data);
    console.log("Uploaded files:", uploadedFiles);
    console.log("Form errors:", form.formState.errors);
    
    // Include uploaded files in the submission data
    const submissionData = {
      ...data,
      exampleTexts: uploadedFiles.map(file => ({
        name: file.name,
        content: file.content,
        type: file.type,
      }))
    };
    
    mutation.mutate(submissionData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {profile ? "Edit Voice Profile" : "Create Voice Profile"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Main Tabs */}
            <Tabs defaultValue="basic" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="basic">Basic Information</TabsTrigger>
                <TabsTrigger value="upload">Upload Files</TabsTrigger>
                <TabsTrigger value="voice">Voice Characteristics</TabsTrigger>
              </TabsList>

              {/* Basic Information Tab */}
              <TabsContent value="basic" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Basic Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Name *</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter profile name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description</FormLabel>
                          <FormControl>
                            <Textarea placeholder="Brief description of this voice profile" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="purpose"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Purpose</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="What is this voice profile intended for? e.g., Professional emails, Creative writing, Technical documentation, Social media posts..."
                              rows={3}
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Upload Files Tab */}
              <TabsContent value="upload" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Upload Example Texts</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      <Label>Example Texts (up to 3 files)</Label>
                      <p className="text-sm text-muted-foreground">
                        Upload sample texts that represent your desired writing style, tone, and language. 
                        Supports: .txt, .pdf, .doc, .docx files (max 5MB each)
                      </p>
                      
                      <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center">
                        <input
                          type="file"
                          id="file-upload"
                          multiple
                          accept=".txt,.pdf,.doc,.docx,text/*"
                          onChange={handleFileUpload}
                          className="hidden"
                          disabled={uploadedFiles.length >= 3}
                        />
                        <label 
                          htmlFor="file-upload" 
                          className={`cursor-pointer flex flex-col items-center space-y-2 ${
                            uploadedFiles.length >= 3 ? 'opacity-50 cursor-not-allowed' : ''
                          }`}
                        >
                          <Upload className="h-8 w-8 text-gray-400" />
                          <span className="text-sm font-medium">
                            {uploadedFiles.length >= 3 ? 'Maximum files reached' : 'Click to upload files'}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            or drag and drop
                          </span>
                        </label>
                      </div>

                      {/* Uploaded Files List */}
                      {uploadedFiles.length > 0 && (
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Uploaded Files:</Label>
                          {uploadedFiles.map((file, index) => (
                            <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                              <div className="flex items-center space-x-2">
                                <FileText className="h-4 w-4 text-blue-500" />
                                <div>
                                  <p className="text-sm font-medium">{file.name}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {file.type} • {(file.size / 1024).toFixed(1)} KB
                                  </p>
                                </div>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeFile(index)}
                                className="text-red-500 hover:text-red-700"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}

                      {uploadedFiles.length > 0 && (
                        <div className="flex items-start space-x-2 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                          <AlertCircle className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                          <p className="text-xs text-blue-700 dark:text-blue-300">
                            These example texts will be analyzed to understand your writing style, tone, and preferences. 
                            The AI will use this analysis to better match your voice in responses.
                          </p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Voice Characteristics Tab */}
              <TabsContent value="voice" className="space-y-4">
                {/* Nested tabs for voice characteristics */}
                <Tabs defaultValue="tone" className="w-full">
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="tone">Tone</TabsTrigger>
                    <TabsTrigger value="structure">Structure</TabsTrigger>
                    <TabsTrigger value="formatting">Formatting</TabsTrigger>
                    <TabsTrigger value="personality">Personality</TabsTrigger>
                  </TabsList>

                  {/* Tone Tab */}
                  <TabsContent value="tone" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Tone</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={form.control}
                      name="toneOptions"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Select tone characteristics (multiple allowed)</FormLabel>
                          <div className="grid grid-cols-3 gap-3">
                            {toneOptions.map((tone) => (
                              <div key={tone} className="flex items-center space-x-2">
                                <Checkbox
                                  id={tone}
                                  checked={field.value?.includes(tone) || false}
                                  onCheckedChange={(checked) => {
                                    const currentValues = field.value || [];
                                    if (checked) {
                                      field.onChange([...currentValues, tone]);
                                    } else {
                                      field.onChange(currentValues.filter(v => v !== tone));
                                    }
                                  }}
                                />
                                <Label htmlFor={tone} className="text-sm">{tone}</Label>
                              </div>
                            ))}
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Custom Tones */}
                    <div className="space-y-2">
                      <Label>Custom Tones</Label>
                      <div className="flex gap-2">
                        <Input
                          placeholder="Add custom tone"
                          value={customTone}
                          onChange={(e) => setCustomTone(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomTone())}
                        />
                        <Button type="button" onClick={addCustomTone} size="sm">
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {(form.watch("customTones") || []).map((tone, index) => (
                          <Badge key={index} variant="secondary" className="flex items-center gap-1">
                            {tone}
                            <X 
                              className="h-3 w-3 cursor-pointer" 
                              onClick={() => removeCustomTone(index)}
                            />
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
                  </TabsContent>

                  {/* Structure Tab */}
                  <TabsContent value="structure" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Structure Templates</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {templatesLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                      </div>
                    ) : (
                      <>
                        <div className="space-y-3">
                          <Label className="text-sm font-medium">Choose a structure template:</Label>
                          
                          {/* Default Templates */}
                          <div className="space-y-2">
                            <Label className="text-xs font-medium text-muted-foreground">Standard Templates</Label>
                            <div className="grid grid-cols-2 gap-2">
                              {structureTemplates?.default?.map((template) => (
                                <Button
                                  key={template.id}
                                  type="button"
                                  variant={selectedStructureTemplate?.id === template.id ? "default" : "outline"}
                                  size="sm"
                                  onClick={() => handleStructureTemplateSelect(template)}
                                  className="text-left justify-start h-auto p-3"
                                >
                                  <div className="flex items-center space-x-2">
                                    <BookOpen className="h-4 w-4 flex-shrink-0" />
                                    <span className="text-sm font-medium">{template.name}</span>
                                  </div>
                                </Button>
                              ))}
                            </div>
                          </div>

                          {/* User Templates */}
                          {structureTemplates?.user && structureTemplates.user.length > 0 && (
                            <div className="space-y-2">
                              <Label className="text-xs font-medium text-muted-foreground">Your Saved Templates</Label>
                              <div className="grid grid-cols-2 gap-2">
                                {structureTemplates.user.map((template) => (
                                  <div key={template.id} className="relative group">
                                    <Button
                                      type="button"
                                      variant={selectedStructureTemplate?.id === template.id ? "default" : "outline"}
                                      size="sm"
                                      onClick={() => handleStructureTemplateSelect(template)}
                                      className="text-left justify-start h-auto p-3 w-full"
                                    >
                                      <div className="flex items-center space-x-2">
                                        <Save className="h-4 w-4 flex-shrink-0" />
                                        <span className="text-sm font-medium truncate">{template.name}</span>
                                      </div>
                                    </Button>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (confirm(`Are you sure you want to delete "${template.name}"?`)) {
                                          deleteStructureTemplate(template.id);
                                        }
                                      }}
                                      className="absolute -top-1 -right-1 h-6 w-6 p-0 rounded-full bg-red-500 text-white hover:bg-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                      <X className="h-3 w-3" />
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Selected Template Info */}
                        {selectedStructureTemplate && (
                          <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
                            <CardContent className="p-4">
                              <div className="space-y-2">
                                <div className="flex items-center space-x-2">
                                  <BookOpen className="h-4 w-4 text-blue-600" />
                                  <Label className="text-sm font-medium text-blue-900 dark:text-blue-100">
                                    {selectedStructureTemplate.name}
                                  </Label>
                                </div>
                                <p className="text-xs text-blue-700 dark:text-blue-300">
                                  {selectedStructureTemplate.description}
                                </p>
                                <div className="mt-2">
                                  <Label className="text-xs font-medium text-blue-900 dark:text-blue-100">Example:</Label>
                                  <div className="bg-white dark:bg-gray-900 rounded p-2 mt-1 text-xs font-mono text-gray-700 dark:text-gray-300 border">
                                    {selectedStructureTemplate.example}
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        )}
                      </>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Structure Preferences</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={form.control}
                      name="structurePreferences"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>How should content be organized and flow?</FormLabel>
                          <div className="space-y-2">
                            {/* Formatting Toolbar */}
                            <div className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-800 rounded-lg border">
                              <Label className="text-xs font-medium">HTML Formatting:</Label>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  const currentValue = field.value || "";
                                  field.onChange(currentValue + "<strong>bold text</strong>");
                                }}
                                className="h-7 px-2 text-xs"
                              >
                                <strong>B</strong>
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  const currentValue = field.value || "";
                                  field.onChange(currentValue + "<em>italic text</em>");
                                }}
                                className="h-7 px-2 text-xs"
                              >
                                <em>I</em>
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  const currentValue = field.value || "";
                                  field.onChange(currentValue + "\n\n<ul>\n  <li>Bullet point 1</li>\n  <li>Bullet point 2</li>\n</ul>\n\n");
                                }}
                                className="h-7 px-2 text-xs"
                              >
                                • List
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  const currentValue = field.value || "";
                                  field.onChange(currentValue + "\n\n<p>New paragraph</p>\n\n");
                                }}
                                className="h-7 px-2 text-xs"
                              >
                                ¶
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  const currentValue = field.value || "";
                                  field.onChange(currentValue + " 😊 ");
                                }}
                                className="h-7 px-2 text-xs"
                              >
                                😊
                              </Button>
                            </div>
                            
                            <FormControl>
                              <Textarea 
                                placeholder="Use HTML formatting for rich text:
<strong>Bold text</strong>
<em>Italic text</em>
<p>Paragraphs with proper spacing</p>

<ul>
  <li>Bullet points</li>
  <li>Multiple items</li>
</ul>

Add emojis 😊 and line breaks for better readability..."
                                rows={8}
                                {...field} 
                                className="font-mono text-sm"
                              />
                            </FormControl>
                            
                            <div className="text-xs text-muted-foreground">
                              <strong>Tip:</strong> You can use HTML tags like &lt;strong&gt;, &lt;em&gt;, &lt;p&gt;, &lt;ul&gt;, &lt;li&gt;, &lt;br&gt; and emojis for rich formatting. This content can be copied and pasted as HTML.
                            </div>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Save Custom Structure */}
                    <div className="flex items-center space-x-2">
                      <Input
                        placeholder="Enter name to save as custom structure"
                        value={customStructureName}
                        onChange={(e) => setCustomStructureName(e.target.value)}
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        onClick={saveCustomStructure}
                        disabled={!customStructureName.trim() || !form.watch("structurePreferences")}
                        size="sm"
                        className="flex items-center space-x-1"
                      >
                        <Save className="h-4 w-4" />
                        <span>Save</span>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
                  </TabsContent>

                  {/* Formatting Tab */}
                  <TabsContent value="formatting" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Formatting</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Bold Usage */}
                    <FormField
                      control={form.control}
                      name="boldUsage"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Use of bold for key points</FormLabel>
                          <FormControl>
                            <div className="space-y-2">
                              <Slider
                                value={[field.value || 2]}
                                onValueChange={(values) => field.onChange(values[0])}
                                max={5}
                                min={0}
                                step={1}
                                className="w-full"
                              />
                              <div className="text-sm text-gray-600">
                                {formattingLabels.boldUsage[field.value || 2]}
                              </div>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Line Spacing */}
                    <FormField
                      control={form.control}
                      name="lineSpacing"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Line spacing: Dense vs spacious</FormLabel>
                          <FormControl>
                            <div className="space-y-2">
                              <Slider
                                value={[field.value || 2]}
                                onValueChange={(values) => field.onChange(values[0])}
                                max={5}
                                min={0}
                                step={1}
                                className="w-full"
                              />
                              <div className="text-sm text-gray-600">
                                {formattingLabels.lineSpacing[field.value || 2]}
                              </div>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Emoji Usage */}
                    <FormField
                      control={form.control}
                      name="emojiUsage"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Emojis: Never / Sparingly / Expressively</FormLabel>
                          <FormControl>
                            <div className="space-y-2">
                              <Slider
                                value={[field.value || 1]}
                                onValueChange={(values) => field.onChange(values[0])}
                                max={5}
                                min={0}
                                step={1}
                                className="w-full"
                              />
                              <div className="text-sm text-gray-600">
                                {formattingLabels.emojiUsage[field.value || 1]}
                              </div>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Lists vs Paragraphs */}
                    <FormField
                      control={form.control}
                      name="listVsParagraphs"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Use of lists vs paragraphs</FormLabel>
                          <FormControl>
                            <div className="space-y-2">
                              <Slider
                                value={[field.value || 2]}
                                onValueChange={(values) => field.onChange(values[0])}
                                max={5}
                                min={0}
                                step={1}
                                className="w-full"
                              />
                              <div className="text-sm text-gray-600">
                                {formattingLabels.listVsParagraphs[field.value || 2]}
                              </div>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Markup Style */}
                    <FormField
                      control={form.control}
                      name="markupStyle"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Markdown / plain text / HTML</FormLabel>
                          <FormControl>
                            <div className="space-y-2">
                              <Slider
                                value={[field.value || 2]}
                                onValueChange={(values) => field.onChange(values[0])}
                                max={5}
                                min={0}
                                step={1}
                                className="w-full"
                              />
                              <div className="text-sm text-gray-600">
                                {formattingLabels.markupStyle[field.value || 2]}
                              </div>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>
                  </TabsContent>

                  {/* Personality Tab */}
                  <TabsContent value="personality" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Personality & Values</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Moral Tone */}
                    <FormField
                      control={form.control}
                      name="moralTone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Moral tone (e.g. sustainability, equity, optimism)</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="e.g., Sustainability-focused, Equity-driven, Optimistic outlook, Evidence-based, Innovation-oriented..."
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Preferred Stance */}
                    <FormField
                      control={form.control}
                      name="preferredStance"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Preferred stance</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select preferred stance" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="challenger">Challenger</SelectItem>
                              <SelectItem value="coach">Coach</SelectItem>
                              <SelectItem value="collaborator">Collaborator</SelectItem>
                              <SelectItem value="curator">Curator</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Ethical Boundaries */}
                    <div className="space-y-2">
                      <Label>Ethical boundaries</Label>
                      <div className="flex gap-2">
                        <Input
                          placeholder='e.g., "Avoid persuasion", "Always cite data"'
                          value={customEthicalBoundary}
                          onChange={(e) => setCustomEthicalBoundary(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addEthicalBoundary())}
                        />
                        <Button type="button" onClick={addEthicalBoundary} size="sm">
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {(form.watch("ethicalBoundaries") || []).map((boundary, index) => (
                          <Badge key={index} variant="outline" className="flex items-center gap-1">
                            {boundary}
                            <X 
                              className="h-3 w-3 cursor-pointer" 
                              onClick={() => removeEthicalBoundary(index)}
                            />
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {/* Humour Level */}
                    <FormField
                      control={form.control}
                      name="humourLevel"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Humour level</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select humour level" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="none">None</SelectItem>
                              <SelectItem value="dry">Dry</SelectItem>
                              <SelectItem value="occasional">Occasional</SelectItem>
                              <SelectItem value="bold">Bold</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>
                  </TabsContent>
                </Tabs>
              </TabsContent>
            </Tabs>

            {/* Actions */}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? "Saving..." : profile ? "Update Profile" : "Create Profile"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}