import { useState } from 'react';

export function useAnnouncementFormState() {
  const [newFolderName, setNewFolderName] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newText, setNewText] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [selectedVoice, setSelectedVoice] = useState('fable'); // Default to UK English voice
  const [voiceDialogVoice, setVoiceDialogVoice] = useState('fable');
  const [playVoiceDialogVoice, setPlayVoiceDialogVoice] = useState('fable');
  
  // AI Generator state
  const [aiTopic, setAiTopic] = useState('');
  const [aiTone, setAiTone] = useState('professional');
  const [aiKeyPoints, setAiKeyPoints] = useState('');
  const [aiQuantity, setAiQuantity] = useState('1');
  const [generatedScripts, setGeneratedScripts] = useState<any[]>([]);
  
  // Loading states
  const [isCreating, setIsCreating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRegeneratingVoice, setIsRegeneratingVoice] = useState(false);
  const [isGeneratingForPlay, setIsGeneratingForPlay] = useState(false);

  const resetForm = () => {
    setNewTitle('');
    setNewText('');
    setNewCategory('');
    setUploadFile(null);
    setAiTopic('');
    setAiTone('professional');
    setAiKeyPoints('');
    setAiQuantity('1');
    setGeneratedScripts([]);
  };

  return {
    // Form fields
    newFolderName,
    setNewFolderName,
    newTitle,
    setNewTitle,
    newText,
    setNewText,
    newCategory,
    setNewCategory,
    uploadFile,
    setUploadFile,
    selectedVoice,
    setSelectedVoice,
    voiceDialogVoice,
    setVoiceDialogVoice,
    playVoiceDialogVoice,
    setPlayVoiceDialogVoice,
    
    // AI Generator
    aiTopic,
    setAiTopic,
    aiTone,
    setAiTone,
    aiKeyPoints,
    setAiKeyPoints,
    aiQuantity,
    setAiQuantity,
    generatedScripts,
    setGeneratedScripts,
    
    // Loading states
    isCreating,
    setIsCreating,
    isUploading,
    setIsUploading,
    isSending,
    setIsSending,
    isCreatingFolder,
    setIsCreatingFolder,
    isGenerating,
    setIsGenerating,
    isRegeneratingVoice,
    setIsRegeneratingVoice,
    isGeneratingForPlay,
    setIsGeneratingForPlay,
    
    // Helpers
    resetForm,
  };
}


