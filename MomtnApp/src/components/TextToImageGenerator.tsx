import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface TextToImageGeneratorProps {
  onImageGenerated: (imageUrl: string) => void;
  isGenerating: boolean;
  setIsGenerating: (value: boolean) => void;
}

export const TextToImageGenerator = ({ onImageGenerated, isGenerating, setIsGenerating }: TextToImageGeneratorProps) => {
  const [gratitudeText, setGratitudeText] = useState("");
  const { toast } = useToast();

  const generateImage = async () => {
    if (!gratitudeText.trim()) {
      toast({
        title: "خطأ",
        description: "يرجى كتابة نص الامتنان أولاً",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);

    try {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Could not create canvas context");

      canvas.width = 800;
      canvas.height = 600;

      // خلفية غامقة مموهة شفافة
      ctx.fillStyle = "rgba(10, 10, 10, 0.4)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // إضافة 30 قلب عشوائي شفاف كديكور
      for (let i = 0; i < 30; i++) {
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        const size = Math.random() * 30 + 15; // حجم القلوب
        const alpha = Math.random() * 0.15 + 0.05; // شفافية القلوب (خفيفة جداً)

        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(Math.random() * Math.PI * 2); // تدوير عشوائي
        ctx.scale(size / 100, size / 100);
        
        ctx.beginPath();
        ctx.moveTo(75, 40);
        ctx.bezierCurveTo(75, 37, 70, 25, 50, 25);
        ctx.bezierCurveTo(20, 25, 20, 62.5, 20, 62.5);
        ctx.bezierCurveTo(20, 80, 40, 102, 75, 120);
        ctx.bezierCurveTo(110, 102, 130, 80, 130, 62.5);
        ctx.bezierCurveTo(130, 62.5, 130, 25, 100, 25);
        ctx.bezierCurveTo(85, 25, 75, 37, 75, 40);
        ctx.closePath();
        
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`; // قلوب بيضاء شفافة كديكور
        ctx.fill();
        ctx.restore();
      }

      // إعداد النص
      ctx.fillStyle = "#ffffff";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = "48px 'Cairo', sans-serif";
      
      // ظل خفيف للنص
      ctx.shadowColor = "rgba(0, 0, 0, 0.5)";
      ctx.shadowBlur = 4;
      ctx.shadowOffsetX = 2;
      ctx.shadowOffsetY = 2;

      // لف النص تلقائياً للأسطر المتعددة
      const words = gratitudeText.split(" ");
      const lines: string[] = [];
      let currentLine = "";
      const maxWidth = canvas.width - 120; // هامش جانبي

      for (const word of words) {
        const testLine = currentLine + (currentLine ? " " : "") + word;
        const metrics = ctx.measureText(testLine);
        if (metrics.width > maxWidth && currentLine) {
          lines.push(currentLine);
          currentLine = word;
        } else {
          currentLine = testLine;
        }
      }
      if (currentLine) lines.push(currentLine);

      const lineHeight = 70; // ارتفاع السطر لخط 48px
      const totalHeight = lines.length * lineHeight;
      const startY = (canvas.height - totalHeight) / 2 + lineHeight / 2;

      lines.forEach((line, index) => {
        const y = startY + index * lineHeight;
        ctx.fillText(line, canvas.width / 2, y);
      });

      canvas.toBlob((blob) => {
        if (blob) {
          const imageUrl = URL.createObjectURL(blob);
          onImageGenerated(imageUrl);
        }
      }, "image/png"); // استخدم PNG لدعم الشفافية

    } catch (error) {
      console.error("Error generating image:", error);
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء إنشاء الصورة",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label htmlFor="gratitudeText" className="block text-sm font-medium text-gray-300 text-right">
          اكتب امتنانك هنا
        </label>
        <Textarea
          id="gratitudeText"
          value={gratitudeText}
          onChange={(e) => setGratitudeText(e.target.value)}
          placeholder="اكتب ما تشعر بالامتنان له اليوم..."
          className="w-full h-32 p-3 rounded-lg bg-gray-800/90 border border-gray-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/50 text-white placeholder-gray-400 text-right resize-none"
          dir="rtl"
          maxLength={200}
        />
        <p className="text-xs text-gray-400 text-right">
          {gratitudeText.length}/200 حرف
        </p>
      </div>

      <Button
        type="button"
        onClick={generateImage}
        disabled={!gratitudeText.trim() || isGenerating}
        className="w-full"
      >
        {isGenerating ? "جاري إنشاء الصورة..." : "إنشاء صورة الامتنان"}
      </Button>
    </div>
  );
};
