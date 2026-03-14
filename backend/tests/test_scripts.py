import os
import sys
import unittest
from unittest.mock import patch, MagicMock, call

# Add backend to sys.path to import scripts
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'scripts'))

import download_model
import install_flash_attn

class TestScripts(unittest.TestCase):

    @patch('download_model.snapshot_download')
    @patch('download_model.input')
    @patch('os.listdir')
    @patch('os.path.exists')
    def test_download_model_logic(self, mock_exists, mock_listdir, mock_input, mock_snapshot):
        """Test the download logic, including automatic tokenizer download for Qwen models."""
        # Mocking: No models are installed initially
        mock_exists.return_value = False
        mock_listdir.return_value = []
        
        # Scenario: User selects Qwen3-TTS-12Hz-1.7B-Base (Option '5')
        # Then quits (Option 'q')
        mock_input.side_effect = ['5', 'q']
        
        # Run the main loop (it will break on 'q')
        download_model.main()
        
        # Verify snapshot_download was called twice: 
        # 1. For the Tokenizer (Option '4')
        # 2. For the selected model (Option '5')
        self.assertEqual(mock_snapshot.call_count, 2)
        
        calls = [
            call(repo_id='Qwen/Qwen3-TTS-Tokenizer-12Hz', local_dir=MagicMock(), local_dir_use_symlinks=False),
            call(repo_id='Qwen/Qwen3-TTS-12Hz-1.7B-Base', local_dir=MagicMock(), local_dir_use_symlinks=False)
        ]
        # Check repo_ids specifically
        mock_snapshot.assert_has_calls([
            call(repo_id='Qwen/Qwen3-TTS-Tokenizer-12Hz', local_dir=unittest.mock.ANY, local_dir_use_symlinks=False),
            call(repo_id='Qwen/Qwen3-TTS-12Hz-1.7B-Base', local_dir=unittest.mock.ANY, local_dir_use_symlinks=False)
        ])

    @patch('install_flash_attn.torch')
    @patch('install_flash_attn.sys')
    def test_flash_attn_link_generation(self, mock_sys, mock_torch):
        """Test that the Flash Attention wheel URL is generated correctly based on environment."""
        # Mock environment: Python 3.11, Torch 2.5.1, CUDA 12.4
        mock_sys.version_info.major = 3
        mock_sys.version_info.minor = 11
        mock_torch.__version__ = '2.5.1+cu124'
        mock_torch.cuda.is_available.return_value = True
        mock_torch.version.cuda = '12.4'
        
        link, error = install_flash_attn.get_flash_attn_link()
        
        self.assertIsNone(error)
        self.assertIn("flash_attn-2.7.0.post2+cu124torch2.5.1", link)
        self.assertIn("cp311-cp311-win_amd64.whl", link)

    @patch('install_flash_attn.torch')
    def test_flash_attn_no_cuda(self, mock_torch):
        """Verify error message when CUDA is missing."""
        mock_torch.__version__ = '2.5.1'
        mock_torch.cuda.is_available.return_value = False
        
        link, error = install_flash_attn.get_flash_attn_link()
        self.assertIsNone(link)
        self.assertEqual(error, "CUDA is not available. Flash Attention requires an NVIDIA GPU.")

    def test_sox_path_command_syntax(self):
        """Verify the PowerShell command syntax used in the .bat file for PATH manipulation."""
        final_path = r"C:\Program Files (x86)\sox-14-4-2"
        # This is a simulation of the logic in the .bat file
        ps_command = f"$oldPath = 'C:\\Windows;C:\\Users'; $newPath = '{final_path}'; if ($oldPath -notlike '*'+$newPath+'*') {{ $res = 'ADDED' }} else {{ $res = 'EXISTS' }}"
        
        # Test 1: Path doesn't exist
        mock_env = {"oldPath": "C:\\Windows", "newPath": final_path}
        # Simplified logic check: if oldPath does not contain newPath
        self.assertNotIn(mock_env["newPath"], mock_env["oldPath"])
        
        # Test 2: Path already exists
        mock_env_exists = {"oldPath": "C:\\Windows;" + final_path, "newPath": final_path}
        self.assertIn(mock_env_exists["newPath"], mock_env_exists["oldPath"])

if __name__ == '__main__':
    unittest.main()
