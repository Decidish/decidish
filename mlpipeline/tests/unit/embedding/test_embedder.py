import unittest
from unittest.mock import MagicMock

from fastembed import TextEmbedding
from mlpipeline.embedding.embedder import TextEmbedder
import numpy as np


class TestTextEmbedder(unittest.TestCase):

    def test_embeds_recipe(self):
        mock_embedder = MagicMock(spec=TextEmbedding)

        fake_vector = np.random.rand(15).astype(np.float32)
        mock_embedder.embed.return_value = fake_vector

        recipe_text = "Spicy Tomato Pasta. A quick dinner. Ingredients: Garlic, Chili, Pasta, Tomatoes."

        under_test = TextEmbedder(mock_embedder)

        actual = under_test.embed_recipes([recipe_text])

        self.assertEqual(len(list(actual)), 15)

        mock_embedder.embed.assert_called()