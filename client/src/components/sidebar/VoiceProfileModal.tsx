import { useState, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Upload, X, FileText, AlertCircle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { insertVoiceProfileSchema } from "@shared/schema";
import type { VoiceProfile } from "@shared/schema";
import { z } from "zod";

interface VoiceProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile?: VoiceProfile | null;
}

const formSchema = insertVoiceProfileSchema.extend({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
});

export default function VoiceProfileModal({ isOpen, onClose, profile }: VoiceProfileModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [dragActive, setDragActive] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: profile?.name || "",
      description: profile?.description || "",
    },
  });

  const createProfileMutation = useMutation({
    mutationFn: async (data: z.infer<typeof formSchema>) => {
      const response = await apiRequest("POST", "/api/voice-profiles", data);
      return response.json();
    },
    onSuccess: (newProfile) => {
      queryClient.invalidateQueries({ queryKey: ["/api/voice-profiles"] });
      
      // Upload files if any
      if (uploadedFiles.length > 0) {
        uploadFiles(newProfile.id);
      } else {
        handleClose();
        toast({
          title: "Success",
          description: "Voice profile created successfully",
        });
      }
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
        description: "Failed to create voice profile",
        variant: "destructive",
      });
    },
  });

  const uploadFilesMutation = useMutation({
    mutationFn: async ({ profileId, files }: { profileId: number; files: File[] }) => {
      const promises = files.map(async (file) => {
        const formData = new FormData();
        formData.append("file", file);
        
        const response = await fetch(`/api/voice-profiles/${profileId}/samples`, {
          method: "POST",
          body: formData,
          credentials: "include",
        });
        
        if (!response.ok) {
          throw new Error(`Failed to upload ${file.name}`);
        }
        
        return response.json();
      });
      
      return Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/voice-profiles"] });
      handleClose();
      toast({
        title: "Success",
        description: "Voice profile created and files uploaded successfully",
      });
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
        description: "Failed to upload files",
        variant: "destructive",
      });
    },
  });

  const uploadFiles = (profileId: number) => {
    uploadFilesMutation.mutate({ profileId, files: uploadedFiles });
  };

  const handleClose = () => {
    form.reset();
    setUploadedFiles([]);
    onClose();
  };

  const onSubmit = (data: z.infer<typeof formSchema>) => {
    createProfileMutation.mutate(data);
  };

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const files = Array.from(e.dataTransfer.files);
    const textFiles = files.filter(file => file.type === "text/plain");
    
    if (textFiles.length !== files.length) {
      toast({
        title: "Unsupported Files",
        description: "Only .txt files are supported",
        variant: "destructive",
      });
    }
    
    setUploadedFiles(prev => [...prev, ...textFiles]);
  }, [toast]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const textFiles = files.filter(file => file.type === "text/plain");
    
    if (textFiles.length !== files.length) {
      toast({
        title: "Unsupported Files",
        description: "Only .txt files are supported",
        variant: "destructive",
      });
    }
    
    setUploadedFiles(prev => [...prev, ...textFiles]);
  };

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Voice Profile</DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Profile Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Professional Writer" {...field} />
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
                    <Textarea
                      placeholder="Brief description of the writing style..."
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="space-y-2">
              <Label>Upload Writing Samples</Label>
              <div
                className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                  dragActive
                    ? "border-green-500 bg-green-50 dark:bg-green-900/20"
                    : "border-slate-300 dark:border-slate-600"
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <Upload className="h-12 w-12 text-slate-400 mx-auto mb-3" />
                <p className="text-slate-600 dark:text-slate-400 mb-2">
                  Drag and drop files here, or click to select
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">
                  Supports: .txt files (Max 10MB each)
                </p>
                <input
                  type="file"
                  multiple
                  accept=".txt"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="file-upload"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => document.getElementById("file-upload")?.click()}
                >
                  Select Files
                </Button>
              </div>
              
              {uploadedFiles.length > 0 && (
                <div className="space-y-2">
                  <Label>Selected Files</Label>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {uploadedFiles.map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-800 rounded"
                      >
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-slate-500" />
                          <span className="text-sm text-slate-700 dark:text-slate-300">
                            {file.name}
                          </span>
                          <span className="text-xs text-slate-500">
                            ({formatFileSize(file.size)})
                          </span>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFile(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5" />
                <div className="text-sm text-blue-700 dark:text-blue-300">
                  <p className="font-medium mb-1">Tips for better voice matching:</p>
                  <ul className="list-disc list-inside space-y-1 text-xs">
                    <li>Upload multiple samples (3-5 recommended)</li>
                    <li>Include diverse content types (emails, articles, etc.)</li>
                    <li>Ensure samples are at least 200-300 words each</li>
                    <li>Use your authentic writing, not edited content</li>
                  </ul>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createProfileMutation.isPending || uploadFilesMutation.isPending}
                className="bg-green-600 hover:bg-green-700"
              >
                {createProfileMutation.isPending || uploadFilesMutation.isPending
                  ? "Creating..."
                  : "Create Profile"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
