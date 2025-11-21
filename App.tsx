
import React, { useState, useCallback, useEffect } from 'react';
import { Placeholder, ExcelRow, TextPlaceholder, ImagePlaceholder, User } from './types';
import FileUpload from './components/FileUpload';
import CertificateEditor from './components/CertificateEditor';
import GeneratedPreview from './components/GeneratedPreview';
import AdminDashboard from './components/AdminDashboard';
import UserDashboard from './components/UserDashboard';
import PricingPage from './components/PricingPage';
import LimitModal from './components/LimitModal';
import LoginModal from './components/LoginModal';
import AuthModal from './components/AuthModal';
import { UserIcon } from './components/icons/UserIcon';
import { PricingIcon } from './components/icons/PricingIcon';
import { LogoutIcon } from './components/icons/LogoutIcon';
import { getFonts } from './db';
import { CheckIcon } from './components/icons/CheckIcon';

// Make TypeScript aware of the global variables from the scripts in index.html
declare var XLSX: any;
declare var JSZip: any;



const StepIndicator: React.FC<{ currentStep: number }> = ({ currentStep }) => {
    const steps = ['رفع التصميم الأساس', 'رفع البيانات', 'تصميم وربط الحقول', 'إنشاء وتحميل'];
    return (
        <nav aria-label="Progress" className="mb-12">
            <ol role="list" className="space-y-4 md:flex md:space-x-8 md:space-y-0">
                {steps.map((step, index) => (
                    <li key={step} className="md:flex-1">
                        {index < currentStep ? (
                             <div className="group flex flex-col border-l-4 border-brand-primary py-2 pl-4 transition-colors md:border-l-0 md:border-t-4 md:pb-0 md:pl-0 md:pt-4">
                                <span className="text-sm font-medium text-brand-primary transition-colors ">{`خطوة ${index + 1}`}</span>
                                <span className="text-sm font-medium">{step}</span>
                            </div>
                        ) : index === currentStep ? (
                            <div className="flex flex-col border-l-4 border-brand-primary py-2 pl-4 md:border-l-0 md:border-t-4 md:pb-0 md:pl-0 md:pt-4" aria-current="step">
                                <span className="text-sm font-medium text-brand-primary">{`خطوة ${index + 1}`}</span>
                                <span className="text-sm font-medium">{step}</span>
                            </div>
                        ) : (
                            <div className="group flex flex-col border-l-4 border-gray-700 py-2 pl-4 transition-colors md:border-l-0 md:border-t-4 md:pb-0 md:pl-0 md:pt-4">
                                <span className="text-sm font-medium text-gray-500 transition-colors">{`خطوة ${index + 1}`}</span>
                                <span className="text-sm font-medium">{step}</span>
                            </div>
                        )}
                    </li>
                ))}
            </ol>
        </nav>
    );
};


const App: React.FC = () => {
  const [step, setStep] = useState(0);
  const [certificateImage, setCertificateImage] = useState<string | null>(null);
  const [excelData, setExcelData] = useState<ExcelRow[]>([]);
  const [excelHeaders, setExcelHeaders] = useState<string[]>([]);
  const [placeholders, setPlaceholders] = useState<Placeholder[]>([]);
  const [generatedCertificates, setGeneratedCertificates] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isUserDashboardOpen, setIsUserDashboardOpen] = useState(false);
  const [isPricingOpen, setIsPricingOpen] = useState(false);
  const [isLimitModalOpen, setIsLimitModalOpen] = useState(false);
  const [customFonts, setCustomFonts] = useState<string[]>([]);
  const [zipImages, setZipImages] = useState<string[]>([]);
  const [isProcessingZip, setIsProcessingZip] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false); // Admin login
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false); // User auth
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);


  const loadCustomFonts = useCallback(async () => {
    try {
        const fonts = await getFonts();
        const styleId = 'custom-fonts-style';
        let styleElement = document.getElementById(styleId) as HTMLStyleElement;
        if (!styleElement) {
            styleElement = document.createElement('style');
            styleElement.id = styleId;
            document.head.appendChild(styleElement);
        }

        const fontFaces = fonts.map(font => {
            const blob = new Blob([font.data]);
            const url = URL.createObjectURL(blob);
            return `@font-face { font-family: '${font.name}'; src: url('${url}'); }`;
        }).join('\n');

        styleElement.innerHTML = fontFaces;
        
        setCustomFonts(fonts.map(f => f.name));
    } catch (error) {
        console.error("Failed to load custom fonts:", error);
    }
  }, []);

  useEffect(() => {
    // Check for a logged-in user in session storage
    const loggedInUser = sessionStorage.getItem('currentUser');
    if (loggedInUser) {
        setCurrentUser(JSON.parse(loggedInUser));
    }
    loadCustomFonts();
  }, [loadCustomFonts]);


  const handleCertificateUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      setCertificateImage(e.target?.result as string);
      setStep(1);
    };
    reader.readAsDataURL(file);
  };

  const handleExcelUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = new Uint8Array(e.target?.result as ArrayBuffer);
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const json = XLSX.utils.sheet_to_json(worksheet) as ExcelRow[];
      
      if (json.length > 0) {
        setExcelData(json);
        setExcelHeaders(Object.keys(json[0]));
        setStep(2);
      } else {
        alert("ملف الإكسل فارغ أو غير صالح.");
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleZipUpload = async (file: File) => {
    if (!JSZip) {
        alert("مكتبة ZIP غير محملة. يرجى تحديث الصفحة.");
        return;
    }
    setIsProcessingZip(true);
    try {
        const zip = await JSZip.loadAsync(file);
        const imagePromises: Promise<string | null>[] = [];
        const imageFiles: { name: string, file: any }[] = [];

        zip.forEach((relativePath, zipEntry) => {
            const isImage = /\.(jpe?g|png|gif|webp)$/i.test(zipEntry.name);
            if (!zipEntry.dir && isImage) {
                imageFiles.push({ name: zipEntry.name, file: zipEntry });
            }
        });

        imageFiles.sort((a, b) => a.name.localeCompare(b.name));

        for (const { name, file: zipEntry } of imageFiles) {
            const promise = zipEntry.async('base64').then((content: string) => {
                const mimeType = name.endsWith('.png') ? 'image/png' : 'image/jpeg';
                return `data:${mimeType};base64,${content}`;
            }).catch((err: any) => {
                console.error(`Error processing ${name} from ZIP:`, err);
                return null;
            });
            imagePromises.push(promise);
        }
        
        const imageDataUrls = (await Promise.all(imagePromises)).filter(Boolean) as string[];
        setZipImages(imageDataUrls);
        alert(`تم استخراج ${imageDataUrls.length} صورة بنجاح من ملف ZIP.`);

    } catch (error) {
        console.error("Error processing ZIP file:", error);
        alert("فشل في معالجة ملف ZIP. قد يكون تالفًا أو بتنسيق غير مدعوم.");
    } finally {
        setIsProcessingZip(false);
    }
  };


  const handleReset = () => {
    setStep(0);
    setCertificateImage(null);
    setExcelData([]);
    setExcelHeaders([]);
    setPlaceholders([]);
    setGeneratedCertificates([]);
    setIsGenerating(false);
    setZipImages([]);
    setIsProcessingZip(false);
  };

  const drawWrappedText = (ctx: CanvasRenderingContext2D, placeholder: TextPlaceholder, text: string) => {
      ctx.font = `${placeholder.fontSize}px ${placeholder.fontFamily}`;
      ctx.fillStyle = placeholder.color;
      ctx.textAlign = placeholder.align;
      ctx.textBaseline = 'top';

      let xPos = placeholder.x;
      if (placeholder.align === 'center') xPos = placeholder.x + placeholder.width / 2;
      if (placeholder.align === 'right') xPos = placeholder.x + placeholder.width;
      
      const words = text.split(' ');
      if (words.length === 0) return;

      const lines: string[] = [];
      let currentLine = words[0];

      for (let i = 1; i < words.length; i++) {
          const word = words[i];
          const testLine = currentLine + ' ' + word;
          const metrics = ctx.measureText(testLine);
          if (metrics.width < placeholder.width) {
              currentLine = testLine;
          } else {
              lines.push(currentLine);
              currentLine = word;
          }
      }
      lines.push(currentLine);

      const lineHeight = placeholder.fontSize * 1.2;
      lines.forEach((line, index) => {
          ctx.fillText(line, xPos, placeholder.y + (index * lineHeight));
      });
  };

  const generateCertificates = useCallback(async () => {
    if (!certificateImage || excelData.length === 0 || placeholders.length === 0) {
        alert("يرجى التأكد من إكمال جميع الخطوات قبل الإنشاء.");
        return;
    }
    
    if (!currentUser) {
        alert("يرجى تسجيل الدخول أولاً لإنشاء الشهادات.");
        setIsAuthModalOpen(true);
        return;
    }

    // Refresh user data from localStorage to get the latest subscription status
    let refreshedUser = currentUser;
    try {
        const allUsers: User[] = JSON.parse(localStorage.getItem('users') || '[]');
        const latestUserData = allUsers.find(u => u.id === currentUser.id);
        if (latestUserData) {
            refreshedUser = latestUserData;
            // Update state and session storage if different to maintain consistency
            if (JSON.stringify(currentUser) !== JSON.stringify(latestUserData)) {
                setCurrentUser(latestUserData);
                sessionStorage.setItem('currentUser', JSON.stringify(latestUserData));
            }
        }
    } catch (e) {
        console.error("Could not refresh user data from localStorage", e);
        refreshedUser = currentUser; // Fallback to state if refresh fails
    }


    let hasActiveSubscription = false;
    if (refreshedUser.subscription.plan !== 'free' && refreshedUser.subscription.expiresAt) {
        const expiryDate = new Date(refreshedUser.subscription.expiresAt);
        // Set expiry to the end of the day to make it inclusive.
        expiryDate.setHours(23, 59, 59, 999); 
        
        const today = new Date();
        // Set today to the beginning of the day for a clean comparison.
        today.setHours(0, 0, 0, 0); 
        
        if (expiryDate >= today) {
            hasActiveSubscription = true;
        }
    }

    if (excelData.length > 5 && !hasActiveSubscription) {
      setIsLimitModalOpen(true);
      return;
    }

    setIsGenerating(true);

    const generated: string[] = [];
    const imageLoadErrors: string[] = [];
    const baseImage = new Image();
    baseImage.src = certificateImage;
    await new Promise(resolve => { baseImage.onload = resolve; });

    for (const font of customFonts) {
        await document.fonts.load(`12px ${font}`);
    }

    const canvas = document.createElement('canvas');
    canvas.width = baseImage.width;
    canvas.height = baseImage.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
        alert("لم نتمكن من إنشاء سياق الرسم.");
        setIsGenerating(false);
        return;
    }
    
    const textPlaceholders = placeholders.filter(p => p.type === 'text') as TextPlaceholder[];
    const imagePlaceholders = placeholders.filter(p => p.type === 'image') as ImagePlaceholder[];

    for (const [index, row] of excelData.entries()) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(baseImage, 0, 0);

        const imageLoadPromises = imagePlaceholders.map(p => {
            let imageUrl: string | undefined;

            if (p.dataSource === 'excel' && p.dataColumn) {
                imageUrl = row[p.dataColumn] as string;
            } else if (p.dataSource === 'zip') {
                imageUrl = zipImages[index];
            }

            if (!imageUrl) return Promise.resolve(null);

            return new Promise(resolve => {
                const img = new Image();
                img.crossOrigin = "anonymous";
                img.onload = () => resolve({ img, p });
                img.onerror = () => {
                    const errorMsg = `صف ${index + 1}: تعذر تحميل الصورة من العمود '${p.dataColumn || 'ZIP'}'`;
                    if(!imageLoadErrors.includes(errorMsg)) {
                        imageLoadErrors.push(errorMsg);
                    }
                    console.warn(`Could not load image from ${imageUrl} for placeholder ${p.id}`);
                    resolve(null);
                };
                img.src = imageUrl;
            });
        });


        const loadedImages = await Promise.all(imageLoadPromises);
        
        loadedImages.forEach((result: { img: HTMLImageElement; p: ImagePlaceholder } | null) => {
            if (result) {
                const { img, p } = result;
                const placeholderWidth = p.width;
                const placeholderHeight = p.height;
                const placeholderX = p.x;
                const placeholderY = p.y;
                
                const imageWidth = img.naturalWidth;
                const imageHeight = img.naturalHeight;
        
                const imageAspectRatio = imageWidth / imageHeight;
                const placeholderAspectRatio = placeholderWidth / placeholderHeight;
        
                let drawWidth, drawHeight;
        
                if (imageAspectRatio > placeholderAspectRatio) {
                    drawWidth = placeholderWidth;
                    drawHeight = drawWidth / imageAspectRatio;
                } else {
                    drawHeight = placeholderHeight;
                    drawWidth = drawHeight * imageAspectRatio;
                }
                
                const drawX = placeholderX + (placeholderWidth - drawWidth) / 2;
                const drawY = placeholderY + (placeholderHeight - drawHeight) / 2;
        
                ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
            }
        });

        for (const p of textPlaceholders) {
            const text = p.dataColumn && row[p.dataColumn] ? String(row[p.dataColumn]) : '';
            drawWrappedText(ctx, p, text);
        }

        generated.push(canvas.toDataURL('image/png'));
    }

    if (imageLoadErrors.length > 0) {
        alert(`اكتمل الإنشاء، لكن فشل تحميل ${imageLoadErrors.length} صورة. يرجى التحقق من مصدر بياناتك (روابط Excel أو صور ZIP).\n\nالخطأ الأول: ${imageLoadErrors[0]}`);
    }

    setGeneratedCertificates(generated);
    setIsGenerating(false);
    setStep(3);
}, [certificateImage, excelData, placeholders, customFonts, zipImages, currentUser]);


  const renderStepContent = () => {
    switch (step) {
      case 0:
        return <FileUpload onFileSelect={handleCertificateUpload} title="رفع قالب التصميم" acceptedTypes="image/png, image/jpeg" />;
      case 1:
        return <FileUpload onFileSelect={handleExcelUpload} title="رفع بيانات المتغيرات" acceptedTypes=".xlsx, .xls, .csv" />;
      case 2:
        return <CertificateEditor 
                    imageSrc={certificateImage!} 
                    excelHeaders={excelHeaders} 
                    excelData={excelData} 
                    placeholders={placeholders} 
                    setPlaceholders={setPlaceholders} 
                    onGenerate={generateCertificates} 
                    isGenerating={isGenerating} 
                    customFonts={customFonts}
                    zipImages={zipImages}
                    onZipUpload={handleZipUpload}
                    isProcessingZip={isProcessingZip}
                />;
      case 3:
        return <GeneratedPreview certificates={generatedCertificates} excelData={excelData} onReset={handleReset}/>;
      default:
        return null;
    }
  };

  const handleAdminClick = () => {
    if (isAdminAuthenticated) {
      setIsAdminOpen(true);
    } else {
      setIsLoginModalOpen(true);
    }
  };

  const handleAdminLoginSuccess = () => {
    setIsAdminAuthenticated(true);
    setIsLoginModalOpen(false);
    setIsAdminOpen(true);
  };
  
  const handleAuthSuccess = (user: User) => {
    setCurrentUser(user);
    sessionStorage.setItem('currentUser', JSON.stringify(user));
    setIsAuthModalOpen(false);
  };
  
  const handleLogout = () => {
    setCurrentUser(null);
    sessionStorage.removeItem('currentUser');
  };

  return (
    <div className="min-h-screen container mx-auto p-4 md:p-8">
      <header className="mb-12">
        <div className="flex justify-end items-center space-x-2 space-x-reverse">
            {currentUser ? (
                <>
                    <span className="text-gray-300 text-sm hidden sm:block">أهلاً بك، {currentUser.name}</span>
                    <button 
                        onClick={() => setIsUserDashboardOpen(true)} 
                        className="p-2 text-gray-400 hover:text-white transition-colors"
                        aria-label="افتح لوحة تحكم المستخدم"
                        title="لوحة التحكم"
                    >
                        <UserIcon />
                    </button>
                     <button 
                        onClick={handleLogout} 
                        className="p-2 text-gray-400 hover:text-white transition-colors"
                        aria-label="تسجيل الخروج"
                        title="تسجيل الخروج"
                    >
                        <LogoutIcon />
                    </button>
                </>
            ) : (
                <>
                    <button onClick={() => setIsAuthModalOpen(true)} className="font-semibold text-gray-300 hover:text-white transition-colors py-2 px-4">
                        تسجيل الدخول
                    </button>
                    <button onClick={() => setIsAuthModalOpen(true)} className="font-semibold bg-brand-primary hover:bg-brand-secondary text-white transition-colors py-2 px-4 rounded-lg">
                        إنشاء حساب
                    </button>
                </>
            )}
             <button 
                onClick={() => setIsPricingOpen(true)} 
                className="p-2 text-gray-400 hover:text-white transition-colors"
                aria-label="افتح صفحة الباقات والأسعار"
                title="الأسعار"
            >
                <PricingIcon />
            </button>

           


        </div>
        
    <div className="w-full md:w-[100%] max-w-full" left>
        <img 
            src="pic/hero.jpg"   // ← ضع صورتك هنا
            alt="Hero Image"
            className="w-full h-auto rounded-xl object-cover select-none"
        />
    </div>
        <div className="flex flex-col-reverse md:flex-row items-center justify-between gap-8 mt-8">
            <div className="md:w-1/2 text-center md:text-right">
                <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-brand-primary to-brand-secondary">متغير</h1>
                <p className="mt-4 text-lg text-gray-300">توليد المتغيارات في التصاميم. أنشئ تصميمات مخصصة تلقائيًا من بياناتك.</p>
               
                <div className="mt-8 grid grid-cols-2 gap-4">
                    <div className="flex flex-col items-center justify-center text-center bg-gray-800/50 backdrop-blur-sm p-4 rounded-lg border border-gray-700 transition-all duration-300 hover:border-brand-primary hover:bg-gray-700/60 hover:-translate-y-1">
                        <CheckIcon />
                        <p className="font-semibold text-sm mt-2">توليد شهادات تقدير</p>
                    </div>
                    <div className="flex flex-col items-center justify-center text-center bg-gray-800/50 backdrop-blur-sm p-4 rounded-lg border border-gray-700 transition-all duration-300 hover:border-brand-primary hover:bg-gray-700/60 hover:-translate-y-1">
                        <CheckIcon />
                        <p className="font-semibold text-sm mt-2">توليد كروت</p>
                    </div>
                    <div className="flex flex-col items-center justify-center text-center bg-gray-800/50 backdrop-blur-sm p-4 rounded-lg border border-gray-700 transition-all duration-300 hover:border-brand-primary hover:bg-gray-700/60 hover:-translate-y-1">
                        <CheckIcon />
                        <p className="font-semibold text-sm mt-2">توليد دروع تكريم</p>
                    </div>
                    <div className="flex flex-col items-center justify-center text-center bg-gray-800/50 backdrop-blur-sm p-4 rounded-lg border border-gray-700 transition-all duration-300 hover:border-brand-primary hover:bg-gray-700/60 hover:-translate-y-1">
                        <CheckIcon />
                        <p className="font-semibold text-sm mt-2">توليد فواتير</p>
                    </div>
                </div>
            </div>
            <div className="md:w-1/2 w-full max-w-sm">
                <div className="relative h-48 flex justify-center items-center group">
                    <div className="absolute w-64 h-40 bg-gray-700/50 backdrop-blur-sm rounded-xl transform rotate-6 transition-transform group-hover:rotate-3 shadow-2xl border border-brand-secondary/30"></div>
                    <div className="absolute w-64 h-40 bg-gray-600/50 backdrop-blur-sm rounded-xl transform -rotate-6 transition-transform group-hover:-rotate-3 shadow-2xl border border-brand-primary/30"></div>
                    <div className="absolute w-64 h-40 bg-gray-800 rounded-xl shadow-2xl flex flex-col items-center justify-center p-4 border border-gray-500">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-brand-secondary mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" /></svg>
                        <p className="text-center font-semibold text-lg">{'{اسم الطالب}'}</p>
                        <p className="text-center text-xs text-gray-400">تصميم متغير</p>
                    </div>
                </div>
            </div>
        </div>
        
      </header>
      
      <main className="bg-gray-800 p-6 md:p-8 rounded-2xl shadow-2xl">
        {step < 4 && <StepIndicator currentStep={step} />}
        {renderStepContent()}
      </main>
      
      <footer className="text-center mt-8 text-gray-500">
        <p>جميع حقوق الموقع محفوظة للمهندس khaled omar</p>
        <div className="flex justify-center space-x-4 space-x-reverse mt-2 text-sm">
            <button onClick={handleAdminClick} className="text-gray-400 hover:text-brand-primary underline">
                لوحة تحكم المدير
            </button>
        </div>
      </footer>

      {isLoginModalOpen && (
        <LoginModal
          onClose={() => setIsLoginModalOpen(false)}
          onLoginSuccess={handleAdminLoginSuccess}
        />
       )}
      
      {isAuthModalOpen && (
        <AuthModal
          onClose={() => setIsAuthModalOpen(false)}
          onAuthSuccess={handleAuthSuccess}
        />
      )}

       {isAdminAuthenticated && isAdminOpen && (
        <AdminDashboard 
            onClose={() => setIsAdminOpen(false)} 
            onFontsUpdate={loadCustomFonts}
        />
      )}
       {isUserDashboardOpen && currentUser && (
        <UserDashboard 
            user={currentUser}
            onClose={() => setIsUserDashboardOpen(false)} 
            onFontsUpdate={loadCustomFonts}
        />
       )}
       {isPricingOpen && (
         <PricingPage 
            onClose={() => setIsPricingOpen(false)}
         />
       )}
       {isLimitModalOpen && (
        <LimitModal 
            onClose={() => setIsLimitModalOpen(false)} 
            onUpgrade={() => {
              setIsLimitModalOpen(false);
              setIsPricingOpen(true);
            }}
        />
      )}
    </div>
  );
};

export default App;
