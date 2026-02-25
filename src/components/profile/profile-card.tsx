
// src/components/profile/profile-card.tsx
"use client";

import React, { useEffect, useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Mail, User as UserIcon, Shield, Edit3, UploadCloud, Briefcase, Calendar as CalendarIconLucide, Phone, Smile, Loader2 } from 'lucide-react';
import type { User, BadgeId } from '@/types';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { format, parseISO, isValid } from 'date-fns';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { BADGE_DEFINITIONS } from '@/services/badgeService';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const MAX_FILE_SIZE_KB = 200;

const profileFormSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  designation: z.string().optional(),
  nic: z.string().optional(),
  dateOfBirth: z.string().optional(), 
  gender: z.string().optional(),
  mobileNumber: z.string().optional(),
  photoUrl: z.string().optional(), 
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

interface ProfileCardProps {
  user: User;
  onUpdateProfile: (updatedData: Partial<User>) => Promise<void>;
  isUpdatingProfile: boolean; 
  badges: BadgeId[];
  isLoadingBadges: boolean;
}

const calculateProfileCompletion = (user: User): { percentage: number; missingFields: string[] } => {
    const fieldsToCheck = {
      'Photo': user.photoUrl && !user.photoUrl.includes('placehold.co'),
      'Designation': !!user.designation,
      'NIC': !!user.nic,
      'Date of Birth': !!user.dateOfBirth,
      'Gender': !!user.gender,
      'Mobile Number': !!user.mobileNumber,
    };

    const totalFields = Object.keys(fieldsToCheck).length;
    const completedFields = Object.values(fieldsToCheck).filter(Boolean).length;
    
    const missingFields = Object.entries(fieldsToCheck)
      .filter(([, isCompleted]) => !isCompleted)
      .map(([fieldName]) => fieldName);

    const percentage = Math.round((completedFields / totalFields) * 100);

    return { percentage, missingFields };
};

export function ProfileCard({ user, onUpdateProfile, isUpdatingProfile: isParentUpdating, badges, isLoadingBadges }: ProfileCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [selectedBase64Image, setSelectedBase64Image] = useState<string | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(user.photoUrl || null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      name: user.name || "",
      designation: user.designation || "",
      nic: user.nic || "",
      dateOfBirth: user.dateOfBirth || "",
      gender: user.gender || "",
      mobileNumber: user.mobileNumber || "",
      photoUrl: user.photoUrl || "",
    },
  });

  const { percentage, missingFields } = calculateProfileCompletion(user);

  useEffect(() => {
    form.reset({
      name: user.name || "",
      designation: user.designation || "",
      nic: user.nic || "",
      dateOfBirth: user.dateOfBirth || "",
      gender: user.gender || "",
      mobileNumber: user.mobileNumber || "",
      photoUrl: user.photoUrl || "",
    });
    if (!isEditing) {
        setImagePreviewUrl(user.photoUrl || null);
        setSelectedBase64Image(null); 
    }
  }, [user, form, isEditing]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      if (file.size > MAX_FILE_SIZE_KB * 1024) { 
        toast({ title: "File Too Large", description: `Profile image must be less than ${MAX_FILE_SIZE_KB}KB.`, variant: "destructive" });
        return;
      }
      if (!file.type.startsWith('image/')) {
        toast({ title: "Invalid File Type", description: "Please select an image file.", variant: "destructive" });
        return;
      }
      
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setSelectedBase64Image(base64String);
        setImagePreviewUrl(base64String);
      };
      reader.onerror = () => {
        toast({ title: "File Read Error", description: "Could not read the image file.", variant: "destructive" });
        setSelectedBase64Image(null);
        setImagePreviewUrl(user.photoUrl || null);
      }
      reader.readAsDataURL(file);
    }
  };

  const handleFormSubmit = async (values: ProfileFormValues) => {
    let finalPhotoUrl = user.photoUrl; 

    if (selectedBase64Image) {
      finalPhotoUrl = selectedBase64Image; 
    }
    
    let dobToSave: string | undefined = undefined;
    if (values.dateOfBirth) {
        const parsedFromString = parseISO(values.dateOfBirth);
        if (isValid(parsedFromString)) {
            dobToSave = format(parsedFromString, "yyyy-MM-dd");
        } else {
            dobToSave = values.dateOfBirth; 
        }
    }
    
    await onUpdateProfile({
      id: user.id, 
      name: values.name,
      designation: values.designation,
      nic: values.nic,
      gender: values.gender,
      mobileNumber: values.mobileNumber,
      photoUrl: finalPhotoUrl,
      dateOfBirth: dobToSave,
    });
    setIsEditing(false); 
    setSelectedBase64Image(null);
  };

  const getInitials = (name?: string) => {
    if (!name) return "??";
    const names = name.split(' ');
    if (names.length === 1) return names[0].substring(0, 2).toUpperCase();
    return (names[0][0] + names[names.length - 1][0]).toUpperCase();
  };
  
  let displayFormattedDoB: string | undefined = undefined;
  if (user.dateOfBirth && typeof user.dateOfBirth === 'string') {
    const parsedDate = parseISO(user.dateOfBirth);
    if (isValid(parsedDate)) {
      displayFormattedDoB = format(parsedDate, "MMMM d, yyyy");
    }
  }
  
  const selectedDateForPicker = form.watch("dateOfBirth");
  let dateForPicker: Date | undefined = undefined;
  if (selectedDateForPicker) {
    if (typeof selectedDateForPicker === 'string') {
      const parsed = parseISO(selectedDateForPicker);
      if (isValid(parsed)) {
        dateForPicker = parsed;
      }
    } else if ((selectedDateForPicker as any) instanceof Date) {
        dateForPicker = selectedDateForPicker as any;
    }
  }

  const currentLoadingState = isParentUpdating;

  return (
    <Card className="w-full max-w-2xl mx-auto shadow-lg">
      <CardHeader className="text-center p-4 sm:p-6">
        <div className="relative mx-auto w-24 h-24 sm:w-32 sm:h-32 mb-4">
          <Avatar className="w-full h-full border-4 border-primary shadow-md">
            <AvatarImage src={imagePreviewUrl || user.photoUrl} alt={user.name} data-ai-hint="profile large_avatar" />
            <AvatarFallback className="text-3xl sm:text-4xl bg-primary/20 text-primary font-bold">
              {getInitials(user.name)}
            </AvatarFallback>
          </Avatar>
          {isEditing && (
            <>
              <input 
                type="file" 
                accept="image/*" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                className="hidden" 
              />
              <Button 
                variant="outline" 
                size="icon" 
                className="absolute bottom-0 right-0 rounded-full bg-background hover:bg-accent w-8 h-8 sm:w-10 sm:h-10" 
                onClick={() => fileInputRef.current?.click()}
                disabled={currentLoadingState}
              >
                <UploadCloud className="h-4 w-4 sm:h-5 sm:w-5" />
                <span className="sr-only">Upload new photo</span>
              </Button>
            </>
          )}
        </div>
        <CardTitle className="text-2xl sm:text-3xl font-headline">{user.name}</CardTitle>
        <CardDescription className="text-base sm:text-lg text-primary capitalize">{user.designation || user.role}</CardDescription>
      </CardHeader>
      
      {percentage < 100 && (
        <>
          <Separator />
          <CardContent className="p-4 sm:p-6">
            <div className="space-y-2">
              <div className="flex justify-between items-center mb-1">
                <h3 className="text-sm font-semibold text-muted-foreground tracking-wider">PROFILE COMPLETION</h3>
                <span className="text-sm font-bold text-primary">{percentage}%</span>
              </div>
              <Progress value={percentage} className="w-full" />
              {!isEditing && (
                <div className="text-xs text-muted-foreground pt-2">
                  <p>To complete your profile, please add:</p>
                  <ul className="list-disc list-inside">
                    {missingFields.map(field => <li key={field}>{field}</li>)}
                  </ul>
                </div>
              )}
            </div>
          </CardContent>
        </>
      )}
      
      <Separator />
      
      <CardContent className="p-4 sm:p-6">
        <h3 className="text-sm font-semibold text-muted-foreground mb-4 text-center tracking-wider">MY ACHIEVEMENTS</h3>
        {isLoadingBadges ? (
           <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {[1,2,3].map(i => (
                  <div key={i} className="flex flex-col items-center text-center gap-2 p-2 border rounded-lg bg-muted/20">
                      <Skeleton className="h-8 w-8 rounded-full" />
                      <Skeleton className="h-4 w-20" />
                  </div>
              ))}
           </div>
        ) : badges.length > 0 ? (
          <TooltipProvider>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {badges.map((badgeId) => {
                const badge = BADGE_DEFINITIONS[badgeId];
                if (!badge) return null;
                const Icon = badge.icon;
                return (
                  <Tooltip key={badgeId}>
                    <TooltipTrigger asChild>
                      <div className="flex flex-col items-center text-center gap-2 p-2 border rounded-lg bg-muted/30 hover:bg-muted/70 transition-colors cursor-pointer">
                        <div className="p-2 bg-primary/10 rounded-full">
                            <Icon className="h-6 w-6 text-primary" />
                        </div>
                        <p className="text-xs font-semibold">{badge.name}</p>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{badge.description}</p>
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
          </TooltipProvider>
        ) : (
          <p className="text-center text-muted-foreground italic text-sm">No achievements yet. Keep participating in events to earn badges!</p>
        )}
      </CardContent>

      <Separator />
      <CardContent className="p-4 sm:p-6 pt-6 space-y-4 sm:space-y-6">
        {isEditing ? (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl><Input {...field} disabled={currentLoadingState} className="w-full" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="designation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Designation</FormLabel>
                    <FormControl><Input placeholder="e.g., Club President" {...field} disabled={currentLoadingState} className="w-full" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormItem>
                <FormLabel>Email Address</FormLabel>
                <Input type="email" value={user.email} disabled className="w-full" />
                <p className="text-xs text-muted-foreground pt-1">Email cannot be changed.</p>
              </FormItem>
               <FormField
                control={form.control}
                name="nic"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>NIC</FormLabel>
                    <FormControl><Input {...field} disabled={currentLoadingState} className="w-full" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="dateOfBirth"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Date of Birth</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            disabled={currentLoadingState}
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {dateForPicker ? (
                              format(dateForPicker, "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIconLucide className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <CalendarComponent
                          mode="single"
                          selected={dateForPicker} 
                          onSelect={(date) => field.onChange(date ? format(date, "yyyy-MM-dd") : "")} 
                          disabled={(date) =>
                            date > new Date() || date < new Date("1900-01-01") || currentLoadingState
                          }
                          initialFocus
                          captionLayout="dropdown-buttons"
                          fromYear={1900}
                          toYear={new Date().getFullYear()}
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="gender"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Gender</FormLabel>
                    <FormControl><Input placeholder="e.g., Male, Female, Other" {...field} disabled={currentLoadingState} className="w-full" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="mobileNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mobile Number</FormLabel>
                    <FormControl><Input type="tel" {...field} disabled={currentLoadingState} className="w-full" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-2 pt-4">
                <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={() => {setIsEditing(false); setSelectedBase64Image(null); setImagePreviewUrl(user.photoUrl || null);}} disabled={currentLoadingState}>Cancel</Button>
                <Button type="submit" className="w-full sm:w-auto" disabled={currentLoadingState}>
                  {currentLoadingState && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {currentLoadingState ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </form>
          </Form>
        ) : (
          <>
            <ProfileInfoItem icon={UserIcon} label="Full Name" value={user.name} />
            <ProfileInfoItem icon={Briefcase} label="Designation" value={user.designation} className="capitalize" />
            <ProfileInfoItem icon={Mail} label="Email Address" value={user.email} />
            <ProfileInfoItem icon={Shield} label="Role" value={user.role} className="capitalize" />
            <ProfileInfoItem icon={Briefcase} label="NIC" value={user.nic} />
            <ProfileInfoItem icon={CalendarIconLucide} label="Date of Birth" value={displayFormattedDoB} />
            <ProfileInfoItem icon={Smile} label="Gender" value={user.gender} />
            <ProfileInfoItem icon={Phone} label="Mobile Number" value={user.mobileNumber} />
            
            <div className="pt-4 text-right">
              <Button variant="outline" className="w-full sm:w-auto" onClick={() => setIsEditing(true)}>
                <Edit3 className="mr-2 h-4 w-4" />
                Edit Profile
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

interface ProfileInfoItemProps {
  icon: React.ElementType;
  label: string;
  value?: string;
  className?: string;
}

const ProfileInfoItem: React.FC<ProfileInfoItemProps> = ({ icon: Icon, label, value, className }) => (
  <div className="flex items-start space-x-3">
    <Icon className="h-5 w-5 text-muted-foreground mt-1 shrink-0" />
    <div className="min-w-0">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className={cn("font-medium break-words", className)}>{value || <span className="italic text-muted-foreground/70">Not set</span>}</p>
    </div>
  </div>
);
