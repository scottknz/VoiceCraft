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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, X, Upload, FileText, AlertCircle, BookOpen, Save, Trash2 } from "lucide-react";
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

const formattingOptions = {
  boldUsage: [
    "Never use bold text",
    "Sparingly use bold text", 
    "Sometimes use bold text",
    "Often use bold text",
    "As much as possible use bold text"
  ],
  lineSpacing: [
    "Never use line spacing",
    "Sparingly use line spacing",
    "Sometimes use line spacing", 
    "Often use line spacing",
    "As much as possible use line spacing"
  ],
  emojiUsage: [
    "Never use emojis",
    "Sparingly use emojis",
    "Sometimes use emojis",
    "Often use emojis", 
    "As much as possible use emojis"
  ],
  listVsParagraphs: [
    "Never use lists & bullets",
    "Sparingly use lists & bullets",
    "Sometimes use lists & bullets",
    "Often use lists & bullets",
    "As much as possible use lists & bullets"
  ]
};

const formSchema = insertVoiceProfileSchema.omit({
  userId: true,
}).extend({
  name: z.string().min(1, "Name is required"),
  // Override formatting fields to accept numeric values in the form
  boldUsage: z.number().int().min(0).max(4).optional(),
  lineSpacing: z.number().int().min(0).max(4).optional(),
  emojiUsage: z.number().int().min(0).max(4).optional(),
  listVsParagraphs: z.number().int().min(0).max(4).optional(),
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

  // Helper functions to convert between text and numeric values
  const getFormattingIndex = (textValue: string | null, optionArray: string[]): number => {
    if (!textValue) return 2; // Default to "Sometimes"
    const index = optionArray.findIndex(option => option === textValue);
    return index !== -1 ? index : 2;
  };

  const getFormattingText = (index: number, optionArray: string[]): string => {
    return optionArray[index] || optionArray[2]; // Default to "Sometimes"
  };

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
      boldUsage: profile ? getFormattingIndex(profile.boldUsage as string, formattingOptions.boldUsage) : 2,
      lineSpacing: profile ? getFormattingIndex(profile.lineSpacing as string, formattingOptions.lineSpacing) : 2,
      emojiUsage: profile ? getFormattingIndex(profile.emojiUsage as string, formattingOptions.emojiUsage) : 1,
      listVsParagraphs: profile ? getFormattingIndex(profile.listVsParagraphs as string, formattingOptions.listVsParagraphs) : 2,
      markupStyle: profile?.markupStyle || 2,
      preferredStance: profile?.preferredStance || "",
      humourLevel: profile?.humourLevel || "",
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: z.infer<typeof formSchema>) => {
      // Convert numeric values back to text format for database storage
      const processedData = {
        ...data,
        boldUsage: getFormattingText(data.boldUsage as number, formattingOptions.boldUsage),
        lineSpacing: getFormattingText(data.lineSpacing as number, formattingOptions.lineSpacing), 
        emojiUsage: getFormattingText(data.emojiUsage as number, formattingOptions.emojiUsage),
        listVsParagraphs: getFormattingText(data.listVsParagraphs as number, formattingOptions.listVsParagraphs),
      };
      
      const url = profile ? `/api/voice-profiles/${profile.id}` : "/api/voice-profiles";
      const method = profile ? "PATCH" : "POST";
      const response = await apiRequest(method, url, processedData);
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
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="tone">Tone</TabsTrigger>
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



                  {/* Formatting Tab */}
                  <TabsContent value="formatting" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Formatting</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Create radio button grid table */}
                    <div className="space-y-4">
                      {/* Header Row */}
                      <div className="grid grid-cols-6 gap-4 text-sm font-medium">
                        <div className="text-left">Formatting Question</div>
                        <div className="text-center">Never</div>
                        <div className="text-center">Sparingly</div>
                        <div className="text-center">Sometimes</div>
                        <div className="text-center">Often</div>
                        <div className="text-center">As much as possible</div>
                      </div>

                      {/* Bold Text Row */}
                      <FormField
                        control={form.control}
                        name="boldUsage"
                        render={({ field }) => (
                          <FormItem>
                            <div className="grid grid-cols-6 gap-4 items-center">
                              <FormLabel className="text-left">Bold text</FormLabel>
                              <FormControl>
                                <RadioGroup
                                  value={field.value?.toString() || "2"}
                                  onValueChange={(value) => field.onChange(parseInt(value))}
                                  className="contents"
                                >
                                  <div className="flex justify-center">
                                    <RadioGroupItem value="0" id="bold-0" />
                                  </div>
                                  <div className="flex justify-center">
                                    <RadioGroupItem value="1" id="bold-1" />
                                  </div>
                                  <div className="flex justify-center">
                                    <RadioGroupItem value="2" id="bold-2" />
                                  </div>
                                  <div className="flex justify-center">
                                    <RadioGroupItem value="3" id="bold-3" />
                                  </div>
                                  <div className="flex justify-center">
                                    <RadioGroupItem value="4" id="bold-4" />
                                  </div>
                                </RadioGroup>
                              </FormControl>
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Line Spacing Row */}
                      <FormField
                        control={form.control}
                        name="lineSpacing"
                        render={({ field }) => (
                          <FormItem>
                            <div className="grid grid-cols-6 gap-4 items-center">
                              <FormLabel className="text-left">Line spacing</FormLabel>
                              <FormControl>
                                <RadioGroup
                                  value={field.value?.toString() || "2"}
                                  onValueChange={(value) => field.onChange(parseInt(value))}
                                  className="contents"
                                >
                                  <div className="flex justify-center">
                                    <RadioGroupItem value="0" id="spacing-0" />
                                  </div>
                                  <div className="flex justify-center">
                                    <RadioGroupItem value="1" id="spacing-1" />
                                  </div>
                                  <div className="flex justify-center">
                                    <RadioGroupItem value="2" id="spacing-2" />
                                  </div>
                                  <div className="flex justify-center">
                                    <RadioGroupItem value="3" id="spacing-3" />
                                  </div>
                                  <div className="flex justify-center">
                                    <RadioGroupItem value="4" id="spacing-4" />
                                  </div>
                                </RadioGroup>
                              </FormControl>
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Emojis Row */}
                      <FormField
                        control={form.control}
                        name="emojiUsage"
                        render={({ field }) => (
                          <FormItem>
                            <div className="grid grid-cols-6 gap-4 items-center">
                              <FormLabel className="text-left">Emojis</FormLabel>
                              <FormControl>
                                <RadioGroup
                                  value={field.value?.toString() || "1"}
                                  onValueChange={(value) => field.onChange(parseInt(value))}
                                  className="contents"
                                >
                                  <div className="flex justify-center">
                                    <RadioGroupItem value="0" id="emoji-0" />
                                  </div>
                                  <div className="flex justify-center">
                                    <RadioGroupItem value="1" id="emoji-1" />
                                  </div>
                                  <div className="flex justify-center">
                                    <RadioGroupItem value="2" id="emoji-2" />
                                  </div>
                                  <div className="flex justify-center">
                                    <RadioGroupItem value="3" id="emoji-3" />
                                  </div>
                                  <div className="flex justify-center">
                                    <RadioGroupItem value="4" id="emoji-4" />
                                  </div>
                                </RadioGroup>
                              </FormControl>
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Lists & Bullets Row */}
                      <FormField
                        control={form.control}
                        name="listVsParagraphs"
                        render={({ field }) => (
                          <FormItem>
                            <div className="grid grid-cols-6 gap-4 items-center">
                              <FormLabel className="text-left">Lists & Bullets</FormLabel>
                              <FormControl>
                                <RadioGroup
                                  value={field.value?.toString() || "2"}
                                  onValueChange={(value) => field.onChange(parseInt(value))}
                                  className="contents"
                                >
                                  <div className="flex justify-center">
                                    <RadioGroupItem value="0" id="lists-0" />
                                  </div>
                                  <div className="flex justify-center">
                                    <RadioGroupItem value="1" id="lists-1" />
                                  </div>
                                  <div className="flex justify-center">
                                    <RadioGroupItem value="2" id="lists-2" />
                                  </div>
                                  <div className="flex justify-center">
                                    <RadioGroupItem value="3" id="lists-3" />
                                  </div>
                                  <div className="flex justify-center">
                                    <RadioGroupItem value="4" id="lists-4" />
                                  </div>
                                </RadioGroup>
                              </FormControl>
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
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