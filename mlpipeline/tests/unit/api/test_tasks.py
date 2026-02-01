"""
Tests for mlpipeline API tasks.
Tests background task functions with comprehensive coverage.
"""
import pytest
from unittest.mock import Mock, patch, MagicMock
import asyncio

from mlpipeline.api.tasks import (
    Tasks, 
    init, 
    run_add_recipe_background_task, 
    run_etl_background_task,
    runner
)
from mlpipeline.api.schemas import UserItem


# ============================================================================
# Tasks Class Tests
# ============================================================================

class TestTasksClass:
    """Tests for Tasks class."""

    def test_init(self):
        """Test Tasks initialization."""
        mock_config = Mock()
        mock_parser = Mock()
        mock_embedder = Mock()
        
        tasks = Tasks(mock_config, mock_parser, mock_embedder)
        
        assert tasks.app_config is mock_config
        assert tasks.ingredient_parser is mock_parser
        assert tasks.embedder is mock_embedder

    def test_get_db_connection_with_config(self):
        """Test _get_db_connection creates connection with config."""
        mock_config = Mock()
        mock_config.db_name = "test_db"
        mock_config.db_user = "test_user"
        mock_config.db_password = "test_pass"
        mock_config.db_host = "localhost"
        mock_config.db_port = "5432"
        
        tasks = Tasks(mock_config, Mock(), Mock())
        
        with patch('mlpipeline.api.tasks.psycopg2.connect') as mock_connect:
            mock_connect.return_value = Mock()
            
            conn = tasks._get_db_connection()
            
            mock_connect.assert_called_once_with(
                dbname="test_db",
                user="test_user",
                password="test_pass",
                host="localhost",
                port="5432"
            )

    def test_get_db_connection_without_config_raises_error(self):
        """Test _get_db_connection raises error when config is None."""
        tasks = Tasks(None, Mock(), Mock())
        
        with pytest.raises(RuntimeError, match="app_config is not set"):
            tasks._get_db_connection()

    @patch('mlpipeline.api.tasks.Pipeline')
    @patch('mlpipeline.api.tasks.psycopg2.connect')
    @patch('mlpipeline.api.tasks.asyncio.run')
    def test_run_add_recipe_background_task_success(
        self, mock_asyncio_run, mock_connect, mock_pipeline_class
    ):
        """Test run_add_recipe_background_task executes successfully."""
        mock_config = Mock()
        mock_config.db_name = "test_db"
        mock_config.db_user = "user"
        mock_config.db_password = "pass"
        mock_config.db_host = "host"
        mock_config.db_port = "5432"
        
        mock_parser = Mock()
        mock_embedder = Mock()
        mock_conn = Mock()
        mock_connect.return_value = mock_conn
        
        mock_pipeline = Mock()
        mock_pipeline_class.return_value = mock_pipeline
        
        tasks = Tasks(mock_config, mock_parser, mock_embedder)
        
        tasks.run_add_recipe_background_task("https://example.com/recipe", 42)
        
        mock_pipeline_class.assert_called_once_with(
            mock_conn, mock_parser, mock_embedder, mock_config
        )
        mock_asyncio_run.assert_called_once()
        mock_conn.close.assert_called_once()

    def test_run_add_recipe_background_task_missing_dependencies(self):
        """Test run_add_recipe_background_task raises error when dependencies missing."""
        mock_config = Mock()
        mock_config.db_name = "test"
        mock_config.db_user = "user"
        mock_config.db_password = "pass"
        mock_config.db_host = "host"
        mock_config.db_port = "5432"
        
        tasks = Tasks(mock_config, None, None)  # Missing dependencies
        
        with pytest.raises(RuntimeError, match="dependencies not provided"):
            tasks.run_add_recipe_background_task("https://example.com", 1)

    @patch('mlpipeline.api.tasks.Pipeline')
    @patch('mlpipeline.api.tasks.psycopg2.connect')
    @patch('mlpipeline.api.tasks.asyncio.run')
    def test_run_add_recipe_background_task_closes_conn_on_error(
        self, mock_asyncio_run, mock_connect, mock_pipeline_class
    ):
        """Test connection is closed even when task fails."""
        mock_config = Mock()
        mock_config.db_name = "test"
        mock_config.db_user = "user"
        mock_config.db_password = "pass"
        mock_config.db_host = "host"
        mock_config.db_port = "5432"
        
        mock_conn = Mock()
        mock_connect.return_value = mock_conn
        mock_asyncio_run.side_effect = Exception("Pipeline failed")
        
        tasks = Tasks(mock_config, Mock(), Mock())
        
        with pytest.raises(Exception, match="Pipeline failed"):
            tasks.run_add_recipe_background_task("https://example.com", 1)
        
        mock_conn.close.assert_called_once()

    @patch('mlpipeline.api.tasks.Pipeline')
    @patch('mlpipeline.api.tasks.psycopg2.connect')
    @patch('mlpipeline.api.tasks.asyncio.run')
    def test_run_etl_background_task_success(
        self, mock_asyncio_run, mock_connect, mock_pipeline_class
    ):
        """Test run_etl_background_task executes successfully."""
        mock_config = Mock()
        mock_config.db_name = "test_db"
        mock_config.db_user = "user"
        mock_config.db_password = "pass"
        mock_config.db_host = "host"
        mock_config.db_port = "5432"
        
        mock_parser = Mock()
        mock_embedder = Mock()
        mock_conn = Mock()
        mock_connect.return_value = mock_conn
        
        mock_pipeline = Mock()
        mock_pipeline_class.return_value = mock_pipeline
        
        tasks = Tasks(mock_config, mock_parser, mock_embedder)
        
        tasks.run_etl_background_task(100)
        
        mock_pipeline_class.assert_called_once()
        mock_asyncio_run.assert_called_once()
        mock_conn.close.assert_called_once()

    def test_run_etl_background_task_missing_dependencies(self):
        """Test run_etl_background_task raises error when dependencies missing."""
        mock_config = Mock()
        mock_config.db_name = "test"
        mock_config.db_user = "user"
        mock_config.db_password = "pass"
        mock_config.db_host = "host"
        mock_config.db_port = "5432"
        
        tasks = Tasks(mock_config, None, Mock())  # Missing ingredient_parser
        
        with pytest.raises(RuntimeError, match="dependencies not provided"):
            tasks.run_etl_background_task(1)

    @patch('mlpipeline.api.tasks.Pipeline')
    @patch('mlpipeline.api.tasks.psycopg2.connect')
    @patch('mlpipeline.api.tasks.asyncio.run')
    def test_run_etl_background_task_closes_conn_on_error(
        self, mock_asyncio_run, mock_connect, mock_pipeline_class
    ):
        """Test connection is closed even when ETL fails."""
        mock_config = Mock()
        mock_config.db_name = "test"
        mock_config.db_user = "user"
        mock_config.db_password = "pass"
        mock_config.db_host = "host"
        mock_config.db_port = "5432"
        
        mock_conn = Mock()
        mock_connect.return_value = mock_conn
        mock_asyncio_run.side_effect = Exception("ETL failed")
        
        tasks = Tasks(mock_config, Mock(), Mock())
        
        with pytest.raises(Exception, match="ETL failed"):
            tasks.run_etl_background_task(1)
        
        mock_conn.close.assert_called_once()


# ============================================================================
# Module-level Function Tests
# ============================================================================

class TestModuleLevelFunctions:
    """Tests for module-level wrapper functions."""

    def test_init_creates_runner(self):
        """Test init creates and registers a Tasks runner."""
        import mlpipeline.api.tasks as tasks_module
        
        mock_config = Mock()
        mock_parser = Mock()
        mock_embedder = Mock()
        
        # Save original runner
        original_runner = tasks_module.runner
        
        try:
            init(mock_config, mock_parser, mock_embedder)
            
            assert tasks_module.runner is not None
            assert tasks_module.runner.app_config is mock_config
            assert tasks_module.runner.ingredient_parser is mock_parser
            assert tasks_module.runner.embedder is mock_embedder
        finally:
            # Restore original runner
            tasks_module.runner = original_runner

    def test_run_add_recipe_background_task_without_init_raises_error(self):
        """Test wrapper raises error when runner not initialized."""
        import mlpipeline.api.tasks as tasks_module
        
        # Save and clear runner
        original_runner = tasks_module.runner
        tasks_module.runner = None
        
        try:
            with pytest.raises(RuntimeError, match="not initialized"):
                run_add_recipe_background_task("https://example.com", 1)
        finally:
            tasks_module.runner = original_runner

    def test_run_etl_background_task_without_init_raises_error(self):
        """Test wrapper raises error when runner not initialized."""
        import mlpipeline.api.tasks as tasks_module
        
        # Save and clear runner
        original_runner = tasks_module.runner
        tasks_module.runner = None
        
        try:
            with pytest.raises(RuntimeError, match="not initialized"):
                run_etl_background_task(1)
        finally:
            tasks_module.runner = original_runner

    def test_run_add_recipe_background_task_delegates_to_runner(self):
        """Test wrapper delegates to registered runner."""
        import mlpipeline.api.tasks as tasks_module
        
        mock_runner = Mock()
        original_runner = tasks_module.runner
        tasks_module.runner = mock_runner
        
        try:
            run_add_recipe_background_task("https://example.com/recipe", 42)
            
            mock_runner.run_add_recipe_background_task.assert_called_once_with(
                "https://example.com/recipe", 42
            )
        finally:
            tasks_module.runner = original_runner

    def test_run_etl_background_task_delegates_to_runner(self):
        """Test wrapper delegates to registered runner."""
        import mlpipeline.api.tasks as tasks_module
        
        mock_runner = Mock()
        original_runner = tasks_module.runner
        tasks_module.runner = mock_runner
        
        try:
            run_etl_background_task(100)
            
            mock_runner.run_etl_background_task.assert_called_once_with(100)
        finally:
            tasks_module.runner = original_runner


# ============================================================================
# Edge Cases and Error Handling Tests
# ============================================================================

class TestTasksEdgeCases:
    """Tests for edge cases and error handling."""

    @patch('mlpipeline.api.tasks.psycopg2.connect')
    def test_db_connection_failure(self, mock_connect):
        """Test handling of database connection failure."""
        mock_connect.side_effect = Exception("Connection refused")
        
        mock_config = Mock()
        mock_config.db_name = "test"
        mock_config.db_user = "user"
        mock_config.db_password = "pass"
        mock_config.db_host = "host"
        mock_config.db_port = "5432"
        
        tasks = Tasks(mock_config, Mock(), Mock())
        
        with pytest.raises(Exception, match="Connection refused"):
            tasks.run_add_recipe_background_task("https://example.com", 1)

    @patch('mlpipeline.api.tasks.Pipeline')
    @patch('mlpipeline.api.tasks.psycopg2.connect')
    def test_pipeline_initialization_failure(self, mock_connect, mock_pipeline_class):
        """Test handling of pipeline initialization failure."""
        mock_config = Mock()
        mock_config.db_name = "test"
        mock_config.db_user = "user"
        mock_config.db_password = "pass"
        mock_config.db_host = "host"
        mock_config.db_port = "5432"
        
        mock_conn = Mock()
        mock_connect.return_value = mock_conn
        mock_pipeline_class.side_effect = Exception("Pipeline init failed")
        
        tasks = Tasks(mock_config, Mock(), Mock())
        
        with pytest.raises(Exception, match="Pipeline init failed"):
            tasks.run_add_recipe_background_task("https://example.com", 1)
        
        # Connection should still be closed
        mock_conn.close.assert_called_once()

    def test_tasks_with_empty_url(self):
        """Test handling of empty recipe URL."""
        mock_config = Mock()
        mock_config.db_name = "test"
        mock_config.db_user = "user"
        mock_config.db_password = "pass"
        mock_config.db_host = "host"
        mock_config.db_port = "5432"
        
        tasks = Tasks(mock_config, Mock(), Mock())
        
        with patch('mlpipeline.api.tasks.psycopg2.connect') as mock_connect:
            with patch('mlpipeline.api.tasks.Pipeline') as mock_pipeline:
                with patch('mlpipeline.api.tasks.asyncio.run'):
                    mock_connect.return_value = Mock()
                    
                    # Empty URL should still be accepted (validation is elsewhere)
                    tasks.run_add_recipe_background_task("", 1)
                    
                    mock_pipeline.assert_called_once()

    def test_tasks_with_negative_job_id(self):
        """Test handling of negative job_id."""
        mock_config = Mock()
        mock_config.db_name = "test"
        mock_config.db_user = "user"
        mock_config.db_password = "pass"
        mock_config.db_host = "host"
        mock_config.db_port = "5432"
        
        tasks = Tasks(mock_config, Mock(), Mock())
        
        with patch('mlpipeline.api.tasks.psycopg2.connect') as mock_connect:
            with patch('mlpipeline.api.tasks.Pipeline') as mock_pipeline:
                with patch('mlpipeline.api.tasks.asyncio.run'):
                    mock_connect.return_value = Mock()
                    
                    # Negative job_id should be accepted (validation is elsewhere)
                    tasks.run_add_recipe_background_task("https://example.com", -1)
                    
                    mock_pipeline.assert_called_once()
