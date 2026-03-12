/**
 * Image Tools Registration
 * All image manipulation tools registered with the tool controller
 */

import { imageCompressor } from './image-compress.mjs';
import { imageConverter } from './image-convert.mjs';
import { imageResizer } from './image-resize.mjs';
import { imageWatermark } from './image-watermark.mjs';

/**
 * Register all image tools
 * @param {ToolController} controller - Tool controller instance
 */
export function registerImageTools(controller) {
  
  // Image Compressor
  controller.registerTool('image-compress', {
    name: 'Image Compressor',
    description: 'Compress images while maintaining visual quality',
    category: 'image',
    icon: '🖼️',
    fileUpload: {
      accept: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
      maxSize: 20 * 1024 * 1024,
      multiple: false
    },
    inputs: [
      {
        name: 'file',
        type: 'file',
        label: 'Image File',
        required: true,
        accept: ['image/jpeg', 'image/png', 'image/webp']
      },
      {
        name: 'quality',
        type: 'integer',
        label: 'Quality (%)',
        required: true,
        min: 1,
        max: 100,
        default: 80
      },
      {
        name: 'maxWidth',
        type: 'integer',
        label: 'Max Width (px)',
        required: false,
        min: 1,
        max: 10000,
        placeholder: 'Original size'
      },
      {
        name: 'maxHeight',
        type: 'integer',
        label: 'Max Height (px)',
        required: false,
        min: 1,
        max: 10000,
        placeholder: 'Original size'
      }
    ],
    outputs: [
      { name: 'file', type: 'blob' },
      { name: 'originalSize', type: 'integer' },
      { name: 'compressedSize', type: 'integer' },
      { name: 'savings', type: 'percentage' }
    ]
  }, imageCompressor);

  // Image Converter
  controller.registerTool('image-convert', {
    name: 'Image Converter',
    description: 'Convert images between different formats',
    category: 'image',
    icon: '🔄',
    fileUpload: {
      accept: ['image/*'],
      maxSize: 20 * 1024 * 1024,
      multiple: false
    },
    inputs: [
      {
        name: 'file',
        type: 'file',
        label: 'Image File',
        required: true,
        accept: ['image/*']
      },
      {
        name: 'format',
        type: 'select',
        label: 'Output Format',
        required: true,
        options: ['png', 'jpeg', 'webp', 'gif'],
        default: 'png'
      },
      {
        name: 'quality',
        type: 'integer',
        label: 'Quality (for JPEG/WebP)',
        required: false,
        min: 1,
        max: 100,
        default: 90
      }
    ],
    outputs: [
      { name: 'file', type: 'blob' },
      { name: 'format', type: 'string' },
      { name: 'dimensions', type: 'object' }
    ]
  }, imageConverter);

  // Image Resizer
  controller.registerTool('image-resize', {
    name: 'Image Resizer',
    description: 'Resize images to specific dimensions',
    category: 'image',
    icon: '📐',
    fileUpload: {
      accept: ['image/*'],
      maxSize: 20 * 1024 * 1024,
      multiple: false
    },
    inputs: [
      {
        name: 'file',
        type: 'file',
        label: 'Image File',
        required: true,
        accept: ['image/*']
      },
      {
        name: 'width',
        type: 'integer',
        label: 'Width (px)',
        required: true,
        min: 1,
        max: 10000
      },
      {
        name: 'height',
        type: 'integer',
        label: 'Height (px)',
        required: true,
        min: 1,
        max: 10000
      },
      {
        name: 'maintainAspect',
        type: 'boolean',
        label: 'Maintain Aspect Ratio',
        required: false,
        default: true
      }
    ],
    outputs: [
      { name: 'file', type: 'blob' },
      { name: 'originalDimensions', type: 'object' },
      { name: 'newDimensions', type: 'object' }
    ]
  }, imageResizer);

  // Image Watermark
  controller.registerTool('image-watermark', {
    name: 'Image Watermark',
    description: 'Add text or image watermarks to images',
    category: 'image',
    icon: '💧',
    fileUpload: {
      accept: ['image/*'],
      maxSize: 20 * 1024 * 1024,
      multiple: false
    },
    inputs: [
      {
        name: 'file',
        type: 'file',
        label: 'Image File',
        required: true,
        accept: ['image/*']
      },
      {
        name: 'watermarkText',
        type: 'string',
        label: 'Watermark Text',
        required: true,
        maxLength: 100
      },
      {
        name: 'position',
        type: 'select',
        label: 'Position',
        required: true,
        options: ['center', 'top-left', 'top-right', 'bottom-left', 'bottom-right'],
        default: 'bottom-right'
      },
      {
        name: 'opacity',
        type: 'integer',
        label: 'Opacity (%)',
        required: true,
        min: 1,
        max: 100,
        default: 50
      },
      {
        name: 'fontSize',
        type: 'integer',
        label: 'Font Size',
        required: true,
        min: 8,
        max: 200,
        default: 24
      }
    ],
    outputs: [
      { name: 'file', type: 'blob' }
    ]
  }, imageWatermark);

  console.log('✓ Image tools registered');
}

export default registerImageTools;
