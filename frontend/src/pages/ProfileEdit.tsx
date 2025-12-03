import { useState, type ChangeEvent, type FC } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Camera, Save, X, Upload, Plus, Trash2, Building, Users, Globe } from 'lucide-react';
import { useEvents } from '../contexts/EventContext';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { useToast } from '../hooks/use-toast';
import { uploadAPI } from '../lib/api';

const ProfileEdit: FC = () => {
  const { currentUser, updateUserProfile } = useEvents();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    displayPicture: currentUser?.displayPicture || '',
    displayPicturePublicId: (currentUser as any)?.displayPicturePublicId || '',
    homeAddress: currentUser?.homeAddress || '',
    companyAddress: currentUser?.companyAddress || '',
    bio: currentUser?.bio || '',
    companyDescription: currentUser?.companyDescription || '',
    hostingCountries: currentUser?.hostingCountries || [],
    pastEvents: currentUser?.pastEvents || [],
    partners: currentUser?.partners || []
  });
  const [showMoreBio, setShowMoreBio] = useState(false);
  const [showMoreCompany, setShowMoreCompany] = useState(false);
  const [showAllPartners, setShowAllPartners] = useState(false);
  const [showAllCountries, setShowAllCountries] = useState(false);


  const [previewImage, setPreviewImage] = useState<string>(currentUser?.displayPicture || '');

  // Helper functions for dynamic fields
  const addPastEvent = () => {
    setFormData(prev => ({
      ...prev,
      pastEvents: [...prev.pastEvents, { eventName: '', country: '', year: new Date().getFullYear(), month: 1 }]
    }));
  };

  const removePastEvent = (index: number) => {
    setFormData(prev => ({
      ...prev,
      pastEvents: prev.pastEvents.filter((_: any, i: number) => i !== index)
    }));
  };

  const updatePastEvent = (index: number, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      pastEvents: prev.pastEvents.map((event: any, i: number) =>
        i === index ? { ...event, [field]: value } : event
      )
    }));
  };

  const addPartner = () => {
    setFormData(prev => ({
      ...prev,
      partners: [...prev.partners, { name: '', type: 'company' as const, description: '' }]
    }));
  };

  const removePartner = (index: number) => {
    setFormData(prev => ({
      ...prev,
      partners: prev.partners.filter((_: any, i: number) => i !== index)
    }));
  };

  const updatePartner = (index: number, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      partners: prev.partners.map((partner: any, i: number) =>
        i === index ? { ...partner, [field]: value } : partner
      )
    }));
  };

  const addHostingCountry = () => {
    setFormData(prev => ({
      ...prev,
      hostingCountries: [...prev.hostingCountries, '']
    }));
  };

  const removeHostingCountry = (index: number) => {
    setFormData(prev => ({
      ...prev,
      hostingCountries: prev.hostingCountries.filter((_: any, i: number) => i !== index)
    }));
  };

  const updateHostingCountry = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      hostingCountries: prev.hostingCountries.map((country: any, i: number) =>
        i === index ? value : country
      )
    }));
  };

  const handleImageUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Show preview immediately
      const reader = new FileReader();
      reader.onload = () => {
        setPreviewImage(reader.result as string);
      };
      reader.readAsDataURL(file);

      // Upload via centralized upload API (axios) so baseURL and auth interceptors are used
      try {
        const uploadFormData = new FormData();
        uploadFormData.append('image', file);

  const resp = await uploadAPI.uploadImage(file as File);

        // uploadAPI.uploadImage expects a File and constructs FormData internally; if it returns data
        const data = resp.data || {};
        const url = data.url || data.secure_url || data.result?.secure_url;
        const publicId = data.publicId || data.public_id || data.public_id;

        if (url) {
          setFormData(prev => ({ ...prev, displayPicture: url, displayPicturePublicId: publicId || '' }));
        } else {
          throw new Error('Upload did not return a URL');
        }
      } catch (error: any) {
        console.error('❌ Image upload error:', error);

        // Reset preview on error
        setPreviewImage(formData.displayPicture || '');

        toast({
          title: 'Upload Failed',
          description: error?.response?.data?.message || error.message || 'Failed to upload image. Please try again.',
          variant: 'destructive',
        });
      }
    }
  };

  const handleRemovePhoto = async () => {
    try {
      if (formData.displayPicturePublicId) {
        await uploadAPI.deleteImage(formData.displayPicturePublicId);
      }
      setFormData(prev => ({ ...prev, displayPicture: '', displayPicturePublicId: '' }));
      setPreviewImage('');
    } catch (error) {
      toast({ title: 'Remove Failed', description: 'Failed to remove photo. Please try again.', variant: 'destructive' });
    }
  };


  const handleSave = async () => {
    try {
      // Client-side filtering to prevent backend validation errors
      const cleaned = {
        ...formData,
        hostingCountries: (formData.hostingCountries || []).filter((c: string) => typeof c === 'string' && c.trim().length > 0),
        partners: (formData.partners || []).filter((p: any) => p && typeof p === 'object' && (p.name?.trim()?.length > 0)).map((p: any) => ({
          name: p.name.trim(),
          type: p.type || 'company',
          description: p.description?.trim() || undefined,
        })),
        pastEvents: (formData.pastEvents || []).filter((e: any) => e && (e.eventName?.trim()?.length > 0)).map((e: any) => ({
          eventName: e.eventName.trim(),
          country: e.country || '',
          month: (typeof e.month === 'number' ? e.month : parseInt(String(e.month), 10)) || undefined,
          year: (typeof e.year === 'number' ? e.year : parseInt(String(e.year), 10)) || undefined,
          description: e.description?.trim() || undefined,
        })),
      };

      const success = await updateUserProfile(cleaned);

      if (success) {
        navigate('/dashboard');
      } else {
        toast({
          title: "Update Failed",
          description: "Failed to update profile. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Profile update error:', error);
      toast({
        title: "Update Failed",
        description: "An error occurred while updating your profile.",
        variant: "destructive",
      });
    }
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen pt-16 flex items-center justify-center font-poppins">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Access Denied</h2>
          <p className="text-muted-foreground">Please login to edit your profile.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-16 bg-gradient-to-br from-background to-muted/50 font-poppins box-border">
      <div className="container mx-auto px-4 sm:px-6 md:px-8 py-8 box-border">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-2xl w-full mx-auto box-border px-0"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-xl font-bold">Edit Profile</h1>
            <Button
              variant="ghost"
              onClick={() => navigate('/dashboard')}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
          </div>


          {/* Public Profile Preview */}
          <Card className="mb-6 border-dashed">
            <CardHeader>
              <CardTitle className='text-[#00593F] text-[18px]'>Public Profile Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-start gap-4">
                <Avatar className="h-12 w-12">
                  { (formData.displayPicture || previewImage) ? (
                    <AvatarImage src={previewImage || formData.displayPicture} />
                  ) : (
                    <AvatarFallback>{(currentUser?.name||'U').charAt(0)}</AvatarFallback>
                  )}
                </Avatar>
                <div className="flex-1">
                  <div className="font-semibold">{currentUser?.name || 'User'}</div>
                  {formData.bio && (
                    <div className={`text-sm text-muted-foreground ${showMoreBio ? '' : 'line-clamp-2'}`}>{formData.bio}</div>
                  )}
                  {formData.bio && formData.bio.length > 120 && (
                    <button className="text-xs text-primary mt-1" onClick={() => setShowMoreBio(!showMoreBio)}>
                      {showMoreBio ? 'Show less' : 'Show more'}
                    </button>
                  )}
                </div>
              </div>

              {/* Expanded public preview of profile fields (mirrors UserProfile) */}
              <div className="mt-4 space-y-5">
                {formData.companyDescription && (
                  <div>
                    <div className="text-xs uppercase text-muted-foreground">Event Company</div>
                    <div className={`text-sm ${showMoreCompany ? '' : 'line-clamp-2'}`}>{formData.companyDescription}</div>
                    {formData.companyDescription.length > 160 && (
                      <button className="text-xs text-primary mt-1" onClick={() => setShowMoreCompany(!showMoreCompany)}>
                        {showMoreCompany ? 'Show less' : 'Show more'}
                      </button>
                    )}
                  </div>
                )}
                {Array.isArray(formData.hostingCountries) && formData.hostingCountries.length > 0 && (
                  <div>
                    <div className="text-xs uppercase text-muted-foreground">Hosting Countries</div>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {(showAllCountries ? formData.hostingCountries : formData.hostingCountries.slice(0, 8)).map((c, i) => (
                        <span key={i} className="px-2 py-0.5 text-xs rounded border border-glass-border/30">{c}</span>
                      ))}
                    </div>
                    {formData.hostingCountries.length > 8 && (
                      <button className="text-xs text-primary mt-1" onClick={() => setShowAllCountries(!showAllCountries)}>
                        {showAllCountries ? 'Show less' : `Show ${formData.hostingCountries.length - 8} more`}
                      </button>
                    )}
                  </div>
                )}
                {Array.isArray(formData.partners) && formData.partners.length > 0 && (
                  <div>
                    <div className="text-xs uppercase text-muted-foreground">Event Partners</div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-1">
                      {(showAllPartners ? formData.partners : formData.partners.slice(0, 4)).map((p: any, i: number) => (
                        <div key={i} className="text-sm">
                          <span className="font-medium">{p.name || 'Partner'}</span>
                          {p.type && <span className="ml-2 text-xs text-muted-foreground">({p.type})</span>}
                          {p.description && <div className="text-xs text-muted-foreground">{p.description}</div>}
                        </div>
                      ))}
                    </div>
                    {formData.partners.length > 4 && (
                      <button className="text-xs text-primary mt-1" onClick={() => setShowAllPartners(!showAllPartners)}>
                        {showAllPartners ? 'Show less' : `Show ${formData.partners.length - 4} more`}
                      </button>
                    )}
                  </div>
                )}
                {Array.isArray(formData.pastEvents) && formData.pastEvents.length > 0 && (
                  <div>
                    <div className="text-xs uppercase text-muted-foreground">Past Events</div>
                    <ul className="list-disc pl-5 text-sm mt-1">
                      {formData.pastEvents.map((pe: any, i: number) => (
                        <li key={i}>{typeof pe === 'string' ? pe : pe?.eventName || 'Event'}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

            </CardContent>
          </Card>

          <Card className="backdrop-blur-glass bg-gradient-glass border-gray-300 shadow-glass">
            <CardHeader>
              <CardTitle className="flex items-center text-[#00593F] text-[18px]">
                <Camera className="h-5 w-5 mr-2" />
                Profile Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Display Picture */}
              <div className="flex flex-col items-center space-y-4">
                <div className="relative">
                  <Avatar className="h-24 w-24 border-4 border-gray-300">
                    {previewImage ? (
                      <AvatarImage src={previewImage} alt="Profile picture" />
                    ) : (
                      <AvatarFallback className="bg-gradient-primary text-primary-foreground text-xl font-bold">
                        {currentUser?.name?.charAt(0) || 'U'}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 hover:opacity-100 transition-opacity cursor-pointer">
                    <Camera className="h-6 w-6 text-white" />
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium">{currentUser?.name || 'User'}</p>
                  <p className="text-xs text-muted-foreground">{currentUser?.email || 'No email'}</p>
                </div>
              </div>

                {/* Photo actions */}
                {(formData.displayPicture || previewImage) && (
                  <div className="flex items-center justify-center gap-3">
                    <Button variant="outline" size="sm" onClick={handleRemovePhoto}>
                      Remove Photo
                    </Button>
                  </div>
                )}


              {/* Upload Button Alternative */}
              <div className="text-center">
                <Label htmlFor="image-upload" className="cursor-pointer">
                  <div className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md bg-glass-light/10 hover:bg-glass-light/20 transition-colors">
                    <Upload className="h-4 w-4 mr-2" />
                    Upload New Picture
                  </div>
                  <input
                    id="image-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </Label>
                <p className="text-xs text-muted-foreground mt-2">
                  This picture will be visible to all users on the platform
                </p>
              </div>

              {/* Home Address */}
              <div className="space-y-2">
                <Label htmlFor="homeAddress">Home Address (Private)</Label>
                <Textarea
                  id="homeAddress"
                  placeholder="Enter your home address..."
                  value={formData.homeAddress}
                  onChange={(e) => setFormData(prev => ({ ...prev, homeAddress: e.target.value }))}
                  className="w-full box-border bg-glass-light/10 border-gray-300 min-h-[80px]"
                />
                <p className="text-xs text-muted-foreground">
                  This information is private and will not be shared with other users
                </p>
              </div>

              {/* Company Address */}
              <div className="space-y-2">
                <Label htmlFor="companyAddress">Company/Work Address (Private)</Label>
                <Textarea
                  id="companyAddress"
                  placeholder="Enter your company or work address..."
                  value={formData.companyAddress}
                  onChange={(e) => setFormData(prev => ({ ...prev, companyAddress: e.target.value }))}
                  className="w-full box-border bg-glass-light/10 border-gray-300 min-h-[80px]"
                />
                <p className="text-xs text-muted-foreground">
                  This information is private and will not be shared with other users
                </p>
              </div>

              {/* Personal Bio */}
              <div className="space-y-2">
                <Label htmlFor="bio" className="flex items-center">
                  <Users className="h-4 w-4 mr-2" />
                  About You (Public)
                </Label>
                <Textarea
                  id="bio"
                  placeholder="Tell people about yourself, your experience in event planning..."
                  value={formData.bio}
                  onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
                  className="w-full box-border bg-glass-light/10 border-gray-300 min-h-[100px]"
                />
                <p className="text-xs text-muted-foreground">
                  This will be visible to all users on your public profile
                </p>
              </div>

              {/* Company Description */}
              <div className="space-y-2">
                <Label htmlFor="companyDescription" className="flex items-center">
                  <Building className="h-4 w-4 mr-2" />
                  Event Company/Organization (Public)
                </Label>
                <Textarea
                  id="companyDescription"
                  placeholder="Describe your event planning company or organization..."
                  value={formData.companyDescription}
                  onChange={(e) => setFormData(prev => ({ ...prev, companyDescription: e.target.value }))}
                  className="w-full box-border bg-glass-light/10 border-gray-300 min-h-[100px]"
                />
                <p className="text-xs text-muted-foreground">
                  This will be visible to all users on your public profile
                </p>
              </div>

              {/* Hosting Countries */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center">
                    <Globe className="h-4 w-4 mr-2" />
                    Countries You Host Events In (Public)
                  </Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addHostingCountry}
                    className="border-gray-300"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Country
                  </Button>
                </div>
                {formData.hostingCountries.map((country: string | undefined, index: number) => (
                  <div key={index} className="flex gap-2">
                    <Select value={country} onValueChange={(value) => updateHostingCountry(index, value)}>
                      <SelectTrigger className="w-full box-border border-gray-300">
                        <SelectValue placeholder="Select country" />
                      </SelectTrigger>
                      <SelectContent className="bg-glass-light/10 backdrop-blur-sm border border-[#00593F]">
                        <SelectItem value="United States">United States</SelectItem>
                        <SelectItem value="United Kingdom">United Kingdom</SelectItem>
                        <SelectItem value="Canada">Canada</SelectItem>
                        <SelectItem value="Australia">Australia</SelectItem>
                        <SelectItem value="Germany">Germany</SelectItem>
                        <SelectItem value="France">France</SelectItem>
                        <SelectItem value="Spain">Spain</SelectItem>
                        <SelectItem value="Italy">Italy</SelectItem>
                        <SelectItem value="Netherlands">Netherlands</SelectItem>
                        <SelectItem value="Japan">Japan</SelectItem>
                        <SelectItem value="South Korea">South Korea</SelectItem>
                        <SelectItem value="Brazil">Brazil</SelectItem>
                        <SelectItem value="Mexico">Mexico</SelectItem>
                        <SelectItem value="India">India</SelectItem>
                        <SelectItem value="China">China</SelectItem>
                        <SelectItem value="Nigeria">Nigeria</SelectItem>
                        <SelectItem value="South Africa">South Africa</SelectItem>
                        <SelectItem value="Kenya">Kenya</SelectItem>
                        <SelectItem value="Ghana">Ghana</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeHostingCountry(index)}
                      className="text-destructive hover:text-destructive/80 p-2"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>

              {/* Past Events with Countries */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center">
                    <Globe className="h-4 w-4 mr-2" />
                    Past Events by Country (Public)
                  </Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addPastEvent}
                    className="border-gray-300"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Event
                  </Button>
                </div>
                {formData.pastEvents.map((event: any, index: number) => (
                  <div key={index} className="p-4 border border-gray-300 rounded-lg space-y-3">
                    <div className="flex justify-between items-start">
                      <h4 className="font-medium text-sm">Past Event #{index + 1}</h4>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removePastEvent(index)}
                        className="text-destructive hover:text-destructive/80 p-1"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs">Event Name</Label>
                        <Input
                          placeholder="Event name"
                          value={event.eventName}
                          onChange={(e) => updatePastEvent(index, 'eventName', e.target.value)}
                          className="w-full box-border bg-glass-light/10 border-gray-300"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Country</Label>
                        <Select value={event.country} onValueChange={(value) => updatePastEvent(index, 'country', value)}>
                          <SelectTrigger className="w-full box-border bg-glass-light/10 border-gray-300">
                            <SelectValue placeholder="Select country" />
                          </SelectTrigger>
                          <SelectContent className="bg-glass-light/10 backdrop-blur-sm border border-[#00593F]">
                            <SelectItem value="United States">United States</SelectItem>
                            <SelectItem value="United Kingdom">United Kingdom</SelectItem>
                            <SelectItem value="Canada">Canada</SelectItem>
                            <SelectItem value="Australia">Australia</SelectItem>
                            <SelectItem value="Germany">Germany</SelectItem>
                            <SelectItem value="France">France</SelectItem>
                            <SelectItem value="Spain">Spain</SelectItem>
                            <SelectItem value="Italy">Italy</SelectItem>
                            <SelectItem value="Netherlands">Netherlands</SelectItem>
                            <SelectItem value="Japan">Japan</SelectItem>
                            <SelectItem value="South Korea">South Korea</SelectItem>
                            <SelectItem value="Brazil">Brazil</SelectItem>
                            <SelectItem value="Mexico">Mexico</SelectItem>
                            <SelectItem value="India">India</SelectItem>
                            <SelectItem value="China">China</SelectItem>
                            <SelectItem value="Nigeria">Nigeria</SelectItem>
                            <SelectItem value="South Africa">South Africa</SelectItem>
                            <SelectItem value="Kenya">Kenya</SelectItem>
                            <SelectItem value="Ghana">Ghana</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs">Year</Label>
                        <Input
                          type="number"
                          min="2000"
                          max="2030"
                          value={event.year}
                          onChange={(e) => updatePastEvent(index, 'year', parseInt(e.target.value))}
                          className="w-full box-border bg-glass-light/10 border-gray-300"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Month</Label>
                        <Select
                          value={String(event.month)}
                          onValueChange={(value) => updatePastEvent(index, 'month', parseInt(value))}
                        >
                          <SelectTrigger className="w-full box-border bg-glass-light/10 border-gray-300">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-glass-light/10 backdrop-blur-sm border border-[#00593F]">
                            {Array.from({length: 12}, (_, i) => (
                              <SelectItem key={i + 1} value={(i + 1).toString()}>
                                {new Date(0, i).toLocaleString('default', { month: 'long' })}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Partners */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center">
                    <Users className="h-4 w-4 mr-2" />
                    Event Partners (Public)
                  </Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addPartner}
                    className="border-gray-300"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Partner
                  </Button>
                </div>
                {formData.partners.map((partner: any, index: number) => (
                  <div key={index} className="p-4 border border-gray-300 rounded-lg space-y-3">
                    <div className="flex justify-between items-start">
                      <h4 className="font-medium text-sm">Partner #{index + 1}</h4>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removePartner(index)}
                        className="text-destructive hover:text-destructive/80 p-1"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs">Partner Name</Label>
                        <Input
                          placeholder="Partner name"
                          value={partner.name}
                          onChange={(e) => updatePartner(index, 'name', e.target.value)}
                          className="w-full box-border bg-glass-light/10 border-glass-border/30"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Type</Label>
                        <Select value={partner.type} onValueChange={(value) => updatePartner(index, 'type', value)}>
                          <SelectTrigger className="w-full box-border bg-glass-light/10 border-gray-300">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-glass-light/10 backdrop-blur-sm border border-[#00593F]">
                            <SelectItem value="company">Company</SelectItem>
                            <SelectItem value="individual">Individual</SelectItem>
                            <SelectItem value="organization">Organization</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs">Description (Optional)</Label>
                      <Textarea
                        placeholder="Describe your partnership..."
                        value={partner.description || ''}
                        onChange={(e) => updatePartner(index, 'description', e.target.value)}
                        className="w-full box-border bg-glass-light/10 border-gray-300 min-h-[60px]"
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => navigate('/dashboard')}
                  className="border-gray-300"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSave}
                  className="bg-gradient-primary border-0 shadow-glow"
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default ProfileEdit;
