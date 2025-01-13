import React, { useEffect, useRef, useState } from 'react';
import { useGeminiAPI } from '../hooks/useGeminiAPI';

interface Point {
  x: number;
  y: number;
}

interface TextBox {
  text: string;
  position: Point;
  width: number;
  height: number;
}

export const Whiteboard: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState<Point | null>(null);
  const [endPoint, setEndPoint] = useState<Point | null>(null);
  const [textBoxes, setTextBoxes] = useState<TextBox[]>([]);
  const [currentPath, setCurrentPath] = useState<Point[]>([]);
  const { processHandwriting, isProcessing } = useGeminiAPI();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const context = canvas.getContext('2d');
    if (!context) return;

    context.lineCap = 'round';
    context.strokeStyle = 'black';
    context.lineWidth = 2;
    contextRef.current = context;

    const handleResize = () => {
      const prevWidth = canvas.width;
      const prevHeight = canvas.height;
      
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      
      context.lineCap = 'round';
      context.strokeStyle = 'black';
      context.lineWidth = 2;

      setTextBoxes(prev => prev.map(box => ({
        ...box,
        position: {
          x: (box.position.x / prevWidth) * canvas.width,
          y: (box.position.y / prevHeight) * canvas.height
        },
        width: (box.width / prevWidth) * canvas.width,
        height: (box.height / prevHeight) * canvas.height
      })));
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!contextRef.current) return;
    
    const ctx = contextRef.current;
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    
    textBoxes.forEach(box => {
      ctx.font = `${box.height}px Arial`;
      ctx.fillStyle = 'black';
      ctx.fillText(box.text, box.position.x, box.position.y + box.height);
    });
  }, [textBoxes]);

  const startDrawing = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const { offsetX, offsetY } = event.nativeEvent;
    if (!contextRef.current) return;

    contextRef.current.beginPath();
    contextRef.current.moveTo(offsetX, offsetY);
    contextRef.current.strokeStyle = 'black';
    contextRef.current.lineWidth = 3;
    setIsDrawing(true);
    setStartPoint({ x: offsetX, y: offsetY });
    setCurrentPath([{ x: offsetX, y: offsetY }]);
  };

  const draw = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !contextRef.current) return;
    const { offsetX, offsetY } = event.nativeEvent;
    contextRef.current.lineTo(offsetX, offsetY);
    contextRef.current.stroke();
    setCurrentPath(prev => [...prev, { x: offsetX, y: offsetY }]);
    setEndPoint({ x: offsetX, y: offsetY });
  };

  const stopDrawing = async () => {
    if (!isDrawing || !startPoint || !endPoint || !canvasRef.current || !contextRef.current) return;
    
    contextRef.current.closePath();
    setIsDrawing(false);

    // Calculate bounding box with padding
    const minX = Math.min(...currentPath.map(p => p.x)) - 10;
    const maxX = Math.max(...currentPath.map(p => p.x)) + 10;
    const minY = Math.min(...currentPath.map(p => p.y)) - 10;
    const maxY = Math.max(...currentPath.map(p => p.y)) + 10;
    
    const width = maxX - minX;
    const height = maxY - minY;

    try {
      // Create a temporary canvas with just the drawn content
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = width;
      tempCanvas.height = height;
      const tempCtx = tempCanvas.getContext('2d');
      
      if (!tempCtx) return;

      // Set white background
      tempCtx.fillStyle = 'white';
      tempCtx.fillRect(0, 0, width, height);
      
      // Copy the drawn content to the temporary canvas
      tempCtx.drawImage(
        canvasRef.current,
        minX,
        minY,
        width,
        height,
        0,
        0,
        width,
        height
      );

      // Get the image data from the temporary canvas
      const imageData = tempCanvas.toDataURL('image/png', 1.0);
      
      // Process the handwriting using Gemini API
      const result = await processHandwriting(imageData);
      
      if (result && result.trim() !== '') {
        // Add new text box
        setTextBoxes(prev => [...prev, {
          text: result,
          position: { x: minX, y: minY },
          width,
          height
        }]);
      }

      // Clear the drawn path
      contextRef.current.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    } catch (error) {
      console.error('Error processing handwriting:', error);
    }

    setStartPoint(null);
    setEndPoint(null);
    setCurrentPath([]);
  };

  return (
    <div className="relative w-full h-screen">
      <canvas
        ref={canvasRef}
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
        className="border border-gray-300 cursor-crosshair"
      />
      {isProcessing && (
        <div className="absolute top-4 right-4 bg-blue-500 text-white px-4 py-2 rounded-md">
          Processing...
        </div>
      )}
    </div>
  );
}; 