import { Injectable } from '@nestjs/common';
import mammoth from 'mammoth';
import pdfParse from 'pdf-parse';
import { MAX_FILE_BYTES, MIN_TEXT_LENGTH } from '../../config/constants';
import { SessionError } from '../../common/session.error';

/** What multer hands us, narrowed to what this service actually needs. */
export type UploadedResume = {
  originalname: string;
  size: number;
  buffer: Buffer;
};

@Injectable()
export class ResumeParserService {
  /** Extracts raw text from an uploaded PDF or DOCX resume. */
  async parseResume(file: UploadedResume): Promise<string> {
    if (file.size > MAX_FILE_BYTES) {
      throw new SessionError(
        'That file is larger than 5MB. Please upload a smaller resume.',
        413,
        'file_too_large',
      );
    }

    const fileName = file.originalname.toLowerCase();

    let text: string;
    try {
      if (fileName.endsWith('.pdf')) {
        text = (await pdfParse(file.buffer)).text;
      } else if (fileName.endsWith('.docx')) {
        text = (await mammoth.extractRawText({ buffer: file.buffer })).value;
      } else {
        throw new SessionError(
          'Only PDF and DOCX resumes are supported.',
          415,
          'unsupported_file_type',
        );
      }
    } catch (cause) {
      if (cause instanceof SessionError) throw cause;
      throw new SessionError(
        "We couldn't read that file. It may be corrupted or password protected.",
        422,
        'unreadable_file',
        { cause },
      );
    }

    const cleaned = text
      .replace(/[ \t]+/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    if (cleaned.length < MIN_TEXT_LENGTH) {
      throw new SessionError(
        "We couldn't find any text in that file. If it's a scan, try a text-based export.",
        422,
        'empty_resume',
      );
    }

    return cleaned;
  }
}
