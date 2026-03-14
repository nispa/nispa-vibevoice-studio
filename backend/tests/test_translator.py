import unittest
from unittest.mock import patch, MagicMock
import sys
import os

# Add backend to path
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from core.translator import InternalTranslator

class TestInternalTranslator(unittest.TestCase):
    @patch('core.translator.AutoTokenizer')
    @patch('core.translator.AutoModelForSeq2SeqLM')
    @patch('core.translator.torch.cuda.is_available')
    def test_singleton_and_loading(self, mock_cuda, mock_model_class, mock_tokenizer_class):
        mock_cuda.return_value = False
        
        # Test singleton
        t1 = InternalTranslator()
        t2 = InternalTranslator()
        self.assertIs(t1, t2)
        
        # Mock model and tokenizer
        mock_model = MagicMock()
        mock_tokenizer = MagicMock()
        mock_model_class.from_pretrained.return_value = mock_model
        mock_tokenizer_class.from_pretrained.return_value = mock_tokenizer
        
        # Trigger load
        t1._load_model()
        
        self.assertTrue(mock_model_class.from_pretrained.called)
        self.assertTrue(mock_tokenizer_class.from_pretrained.called)
        self.assertEqual(t1.device, "cpu")

    @patch('core.translator.InternalTranslator._load_model')
    def test_translation_logic(self, mock_load):
        translator = InternalTranslator()
        translator.model = MagicMock()
        translator.tokenizer = MagicMock()
        
        # Mock tokenizer behavior
        translator.tokenizer.return_value = {"input_ids": MagicMock()}
        translator.tokenizer.lang_code_to_id = {"ita_Latn": 123}
        translator.tokenizer.batch_decode.return_value = ["Ciao mondo"]
        
        result = translator.translate("Hello world", "Italian")
        
        self.assertEqual(result, "Ciao mondo")
        translator.model.generate.assert_called()

if __name__ == '__main__':
    unittest.main()
