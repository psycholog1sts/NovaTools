/**
 * PDF Tools Registration
 * All PDF manipulation tools registered with the tool controller
 */

import { pdfSplitter } from './pdf-split.mjs';
import { pdfMerger } from './pdf-merge.mjs';
import { pdfCompressor } from './pdf-compress.mjs';
import { pdfToImage } from './pdf-to-image.mjs';

/**
 * Register all PDF tools
 * @param {ToolController} controller - Tool controller instance
 */
export function registerPDFTools(controller) {
  
  // PDF Splitter
  controller.registerTool('pdf-split', {
    name: 'PDF Splitter',
    description: 'Split PDF into individual pages or extract specific pages',
    category: 'pdf',
    icon: '📄',
    fileUpload: {
      accept: ['application/pdf'],
      maxSize: 50 * 1024 * 1024,
      multiple: false
    },
    inputs: [
      {
        name: 'file',
        type: 'file',
        label: 'PDF File',
        required: true,
        accept: ['application/pdf'],
        maxSize: 50 * 1024 * 1024
      },
      {
        name: 'mode',
        type: 'select',
        label: 'Split Mode',
        required: true,
        options: ['all', 'range', 'extract'],
        default: 'all'
      },
      {
        name: 'pageRange',
        type: 'string',
        label: 'Page Range (e.g., 1-3,5,7-9)',
        required: false,
        placeholder: 'Leave empty for all pages'
      }
    ],
    outputs: [
      { name: 'files', type: 'array' },
      { name: 'count', type: 'integer' }
    ]
  }, pdfSplitter);

  // PDF Merger
  controller.registerTool('pdf-merge', {
    name: 'PDF Merger',
    description: 'Combine multiple PDF files into one',
    category: 'pdf',
    icon: '📑',
    fileUpload: {
      accept: ['application/pdf'],
      maxSize: 100 * 1024 * 1024,
      multiple: true
    },
    inputs: [
      {
        name: 'files',
        type: 'array',
        label: 'PDF Files',
        required: true,
        minItems: 2
      }
    ],
    outputs: [
      { name: 'file', type: 'blob' },
      { name: 'pageCount', type: 'integer' }
    ]
  }, pdfMerger);

  // PDF Compressor
  controller.registerTool('pdf-compress', {
    name: 'PDF Compressor',
    description: 'Reduce PDF file size while maintaining quality',
    category: 'pdf',
    icon: '🗜️',
    fileUpload: {
      accept: ['application/pdf'],
      maxSize: 50 * 1024 * 1024,
      multiple: false
    },
    inputs: [
      {
        name: 'file',
        type: 'file',
        label: 'PDF File',
        required: true,
        accept: ['application/pdf']
      },
      {
        name: 'quality',
        type: 'select',
        label: 'Compression Level',
        required: true,
        options: ['low', 'medium', 'high'],
        default: 'medium'
      }
    ],
    outputs: [
      { name: 'file', type: 'blob' },
      { name: 'originalSize', type: 'integer' },
      { name: 'compressedSize', type: 'integer' },
      { name: 'savings', type: 'percentage' }
    ]
  }, pdfCompressor);

  // PDF to Image
  controller.registerTool('pdf-to-image', {
    name: 'PDF to Image',
    description: 'Convert PDF pages to images',
    category: 'pdf',
    icon: '🖼️',
    fileUpload: {
      accept: ['application/pdf'],
      maxSize: 50 * 1024 * 1024,
      multiple: false
    },
    inputs: [
      {
        name: 'file',
        type: 'file',
        label: 'PDF File',
        required: true,
        accept: ['application/pdf']
      },
      {
        name: 'format',
        type: 'select',
        label: 'Image Format',
        required: true,
        options: ['png', 'jpeg', 'webp'],
        default: 'png'
      },
      {
        name: 'dpi',
        type: 'integer',
        label: 'DPI (Resolution)',
        required: true,
        min: 72,
        max: 300,
        default: 150
      }
    ],
    outputs: [
      { name: 'images', type: 'array' },
      { name: 'count', type: 'integer' }
    ]
  }, pdfToImage);

  console.log('✓ PDF tools registered');
}

export default registerPDFTools;
